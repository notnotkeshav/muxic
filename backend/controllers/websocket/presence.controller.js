import { Room, Device } from '../../models/index.js'
import { broadcastToRoom } from '../../services/websocket/broadcast.service.js'
import SocketRegistry from '../../utils/websocket/SocketRegistry.js'

export const handlePresenceMessage = async (ws, message) => {
    const { userId, deviceId, roomId } = ws

    switch (message.action) {
        case 'join':
            await handleUserJoin(ws, message.data)
            break
        case 'leave':
            await handleUserLeave(ws)
            break
        case 'heartbeat':
            await handleHeartbeat(ws)
            break
        default:
            throw new Error('Invalid presence action')
    }
}

const handleUserJoin = async (ws, { roomId }) => {
    if (!roomId) throw new Error('Room ID required')

    // Update device status
    await Device.findByIdAndUpdate(ws.deviceId, {
        isOnline: true,
        lastActive: new Date()
    })

    // Add to room participants if not already present
    const room = await Room.findOneAndUpdate(
        {roomId},
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

    if (!room) throw new Error('Room not found')

    // Register in SocketRegistry
    ws.roomId = roomId
    SocketRegistry.updateConnection(ws, { roomId })

    // Notify all room participants
    await broadcastToRoom(roomId, {
        type: 'presence:joined',
        data: {
            userId: ws.userId,
            deviceId: ws.deviceId,
            deviceType: ws.deviceType,
            timestamp: Date.now()
        }
    })

    // Send current participant list to joining user
    const participants = room.participants.map(p => ({
        userId: p.user,
        deviceId: p.devices[0], // Assuming one device per participant for now
        joinedAt: p.joinedAt
    }))

    ws.send(JSON.stringify({
        type: 'presence:list',
        data: {
            participants,
            timestamp: Date.now()
        }
    }))
}

const handleUserLeave = async (ws) => {
    if (!ws.roomId) return

    const roomId = ws.roomId

    // Update device status
    await Device.findByIdAndUpdate(ws.deviceId, {
        isOnline: false,
        lastActive: new Date()
    })

    // Remove from room participants
    await Room.findOneAndUpdate({roomId}, {
        $pull: {
            participants: { user: ws.userId }
        }
    })

    // Update SocketRegistry
    ws.roomId = null
    SocketRegistry.updateConnection(ws, { roomId: null })

    // Notify all room participants
    await broadcastToRoom(roomId, {
        type: 'presence:left',
        data: {
            userId: ws.userId,
            deviceId: ws.deviceId,
            timestamp: Date.now()
        }
    })
}

const handleHeartbeat = async (ws) => {
    // Update last active timestamp
    await Device.findByIdAndUpdate(ws.deviceId, {
        lastActive: new Date()
    })

    if (ws.roomId) {
        ws.send(JSON.stringify({
            type: 'presence:heartbeat_ack',
            data: {
                timestamp: Date.now()
            }
        }))
    }
}

export const presenceController = {
    handlePresenceMessage
}