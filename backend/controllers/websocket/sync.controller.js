// backend/controllers/websocket/sync.controller.js
import { Room, SyncSession } from '../../models/index.js'
import { broadcastToRoom } from '../../services/websocket/broadcast.service.js'

/**
 * Handle synchronization-related WebSocket messages
 */
export const handleSyncMessage = async (ws, message) => {
    try {
        const { userId, deviceId } = ws

        switch (message.action) {
            case 'play':
                return await handlePlay(ws, message.roomId, message.position)
            case 'pause':
                return await handlePause(ws, message.roomId)
            case 'seek':
                return await handleSeek(ws, message.roomId, message.position)
            case 'queue':
                return await handleQueueOperation(ws, message.roomId, message.operation, message.track)
            default:
                throw new Error('Invalid sync action')
        }
    } catch (error) {
        console.error('Sync controller error:', error)
        ws.send(JSON.stringify({
            type: 'error',
            message: error.message || 'Sync operation failed'
        }))
    }
}

// Sync action handlers
const handlePlay = async (ws, roomId, position) => {
    const room = await Room.findByIdAndUpdate(roomId, {
        $set: {
            'playback.isPlaying': true,
            'playback.currentTime': position,
            'playback.lastUpdated': new Date()
        }
    }, { new: true })

    if (!room) throw new Error('Room not found')

    // Log sync event
    await SyncSession.logEvent(roomId, 'play', ws.userId, ws.deviceId, { position })

    broadcastToRoom(roomId, {
        type: 'sync:play',
        position,
        timestamp: Date.now(),
        deviceId: ws.deviceId
    }, ws)
}

const handlePause = async (ws, roomId) => {
    const room = await Room.findByIdAndUpdate(roomId, {
        $set: {
            'playback.isPlaying': false,
            'playback.lastUpdated': new Date()
        }
    }, { new: true })

    if (!room) throw new Error('Room not found')

    // Log sync event
    await SyncSession.logEvent(roomId, 'pause', ws.userId, ws.deviceId)

    broadcastToRoom(roomId, {
        type: 'sync:pause',
        timestamp: Date.now(),
        deviceId: ws.deviceId
    }, ws)
}

const handleSeek = async (ws, roomId, position) => {
    const room = await Room.findByIdAndUpdate(roomId, {
        $set: {
            'playback.currentTime': position,
            'playback.lastUpdated': new Date()
        }
    }, { new: true })

    if (!room) throw new Error('Room not found')

    // Log sync event
    await SyncSession.logEvent(roomId, 'seek', ws.userId, ws.deviceId, { position })

    broadcastToRoom(roomId, {
        type: 'sync:seek',
        position,
        timestamp: Date.now(),
        deviceId: ws.deviceId
    }, ws)
}

const handleQueueOperation = async (ws, roomId, operation, track) => {
    let room

    switch (operation) {
        case 'add':
            room = await Room.findByIdAndUpdate(roomId, {
                $push: {
                    queue: {
                        ...track,
                        addedBy: ws.userId,
                        addedAt: new Date()
                    }
                }
            }, { new: true })
            break
        case 'remove':
            room = await Room.findByIdAndUpdate(roomId, {
                $pull: {
                    queue: { _id: track._id }
                }
            }, { new: true })
            break
        case 'reorder':
            // Implement queue reordering logic
            break
        default:
            throw new Error('Invalid queue operation')
    }

    if (!room) throw new Error('Room not found')

    broadcastToRoom(roomId, {
        type: `sync:queue_${operation}`,
        track,
        timestamp: Date.now()
    })
}

// Export as named exports
export const syncController = {
    handleSyncMessage
}