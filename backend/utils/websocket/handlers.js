// backend/utils/websocket/handlers.js
import Device from '../../models/device.model.js'
import Room from '../../models/room.model.js'

export const handleDisconnect = async (ws) => {
    try {
        if (!ws.deviceId) return

        // Update device status
        await Device.findByIdAndUpdate(ws.deviceId, {
            isOnline: false,
            socketId: null,
            lastActive: new Date()
        })

        // Notify rooms about disconnection
        const rooms = await Room.find({
            'participants.devices': ws.deviceId
        })

        rooms.forEach(async (room) => {
            await Room.updateOne(
                {
                    _id: room._id,
                    'participants.userId': ws.userId
                },
                {
                    $pull: {
                        'participants.$.devices': ws.deviceId
                    }
                }
            )

            // Broadcast leave notification
            if (ws.broadcast) {
                ws.broadcast.to(room._id.toString()).emit('user:disconnected', {
                    userId: ws.userId,
                    deviceId: ws.deviceId
                })
            }
        })
    } catch (err) {
        console.error('Disconnection handler error:', err)
    }
}

export const handleError = (ws, error) => {
    console.error('WebSocket error:', error)
    ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Connection error'
    }))
}