// backend/controllers/websocket/room.controller.js
import { Room, Device } from '../../models/index.js'
import { broadcastToRoom } from '../../services/websocket/broadcast.service.js'
import { validateWsMessage } from '../../validations/ws.schema.js'

/**
 * Handle room-related WebSocket messages
 */
export const handleRoomMessage = async (ws, rawMessage) => {
    try {
        const message = validateWsMessage(rawMessage)
        const { userId, deviceId } = ws

        switch (message.action) {
            case 'create':
                return await handleCreateRoom(ws, message.roomData)
            case 'join':
                return await handleJoinRoom(ws, message.roomId)
            case 'leave':
                return await handleLeaveRoom(ws, message.roomId)
            case 'update':
                return await handleUpdateRoom(ws, message.roomId, message.updates)
            default:
                throw new Error('Invalid room action')
        }
    } catch (error) {
        console.error('Validation error:', error)
        ws.send(JSON.stringify({
            type: 'error',
            message: error.message || 'Invalid message format'
        }))
    }
}

// Room action handlers
const handleJoinRoom = async (ws, roomId) => {
    const room = await Room.findById(roomId)
    if (!room) throw new Error('Room not found')

    // Add participant to room
    await Room.findByIdAndUpdate(roomId, {
        $addToSet: {
            participants: {
                user: ws.userId,
                devices: [ws.deviceId],
                joinedAt: new Date()
            }
        }
    })

    // Notify other participants
    broadcastToRoom(roomId, {
        type: 'room:participant_joined',
        userId: ws.userId,
        deviceId: ws.deviceId
    }, ws)

    // Send current room state to joining user
    ws.send(JSON.stringify({
        type: 'room:state',
        room: room.toObject()
    }))
}

const handleLeaveRoom = async (ws, roomId) => {
    await Room.findByIdAndUpdate(roomId, {
        $pull: {
            participants: { user: ws.userId }
        }
    })

    broadcastToRoom(roomId, {
        type: 'room:participant_left',
        userId: ws.userId,
        deviceId: ws.deviceId
    }, ws)
}

const handleCreateRoom = async (ws, roomData) => {
    const room = new Room({
        ...roomData,
        createdBy: ws.userId,
        participants: [{
            user: ws.userId,
            devices: [ws.deviceId],
            role: 'admin'
        }]
    })

    await room.save()

    ws.send(JSON.stringify({
        type: 'room:created',
        room: room.toObject()
    }))
}

const handleUpdateRoom = async (ws, roomId, updates) => {
    const room = await Room.findOneAndUpdate(
        { _id: roomId, 'participants.user': ws.userId, 'participants.role': 'admin' },
        { $set: updates },
        { new: true }
    )

    if (!room) throw new Error('Room not found or unauthorized')

    broadcastToRoom(roomId, {
        type: 'room:updated',
        updates
    })
}

// Export as named exports
export const roomController = {
    handleRoomMessage
}