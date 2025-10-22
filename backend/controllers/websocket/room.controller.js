import { Room, Device } from '../../models/index.js'
import { broadcastToRoom } from '../../services/websocket/broadcast.service.js'
import { validateWsMessage } from '../../validations/ws.schema.js'
import SocketRegistry from '../../utils/websocket/SocketRegistry.js'

export const handleRoomMessage = async (ws, rawMessage) => {
    try {
        const message = validateWsMessage(rawMessage)
        const { userId, deviceId } = ws

        switch (message.action) {
            case 'join':
                return await handleJoinRoom(ws, message.data?.roomId)
            case 'leave':
                return await handleLeaveRoom(ws)
            // case 'create':
            //     return await handleCreateRoom(ws, message.data)
            // case 'update':
            //     return await handleUpdateRoom(ws, message.data)
            default:
                throw new Error('Invalid room action')
        }
    } catch (error) {
        console.error('Room controller error:', error)
        ws.send(JSON.stringify({
            type: 'error',
            message: error.message || 'Room operation failed'
        }))
    }
}

const handleJoinRoom = async (ws, roomId) => {
    if (!roomId) throw new Error('Room ID required')

    // Find room by roomId field (not _id)
    const room = await Room.findOne({ roomId: roomId })
    if (!room) throw new Error('Room not found')

    // Add participant to room using roomId
    await Room.findOneAndUpdate(
        { roomId },
        {
            $addToSet: {
                participants: {
                    user: ws.userId,
                    devices: [ws.deviceId],
                    joinedAt: new Date()
                }
            }
        },
        { new: true }
    )

    // Register in SocketRegistry
    ws.roomId = roomId
    SocketRegistry.updateConnection(ws, { roomId })

    // Notify others
    await broadcastToRoom(roomId, {
        type: 'room:participant_joined',
        data: {
            userId: ws.userId,
            deviceId: ws.deviceId,
            deviceType: ws.deviceType,
            timestamp: Date.now()
        }
    }, ws)

    // Send current state to joining user
    ws.send(JSON.stringify({
        type: 'room:state',
        data: {
            ...room.toObject(),
            // Ensure we send the correct room identifier
            roomId: room.roomId,
            id: room._id // Also include MongoDB _id if needed
        }
    }))
}

const handleLeaveRoom = async (ws) => {
    if (!ws.roomId) return

    const roomId = ws.roomId
    
    // Remove participant using roomId field
    await Room.findOneAndUpdate(
        { roomId },
        {
            $pull: {
                participants: { user: ws.userId }
            }
        }
    )

    // Update SocketRegistry
    ws.roomId = null
    SocketRegistry.updateConnection(ws, { roomId: null })

    // Notify others
    await broadcastToRoom(roomId, {
        type: 'room:participant_left',
        data: {
            userId: ws.userId,
            deviceId: ws.deviceId,
            timestamp: Date.now()
        }
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
        data: room.toObject()
    }))
}

const handleUpdateRoom = async (ws, updates) => {
    if (!ws.roomId) throw new Error('Not in a room')

    const room = await Room.findOneAndUpdate(
        {
            _id: ws.roomId,
            'participants.user': ws.userId,
            'participants.role': 'admin'
        },
        { $set: updates },
        { new: true }
    )

    if (!room) throw new Error('Room not found or unauthorized')

    await broadcastToRoom(ws.roomId, {
        type: 'room:updated',
        data: updates
    })
}

export const roomController = {
    handleRoomMessage
}