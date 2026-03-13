import { Room, SyncSession } from '../../models/index.js'
import { broadcastToRoom } from '../../services/websocket/broadcast.service.js'
import { validateWsMessage } from '../../validations/ws.schema.js'

export const handleSyncMessage = async (ws, rawMessage) => {
    try {
        const message = validateWsMessage(rawMessage)
        const { userId, deviceId } = ws

        if (!ws.roomId) throw new Error('Not in a room')

        switch (message.action) {
            case 'play':
                return await handlePlay(ws, message.data?.position)
            case 'pause':
                return await handlePause(ws)
            case 'seek':
                return await handleSeek(ws, message.data?.position)
            case 'volume':
                return await handleVolume(ws, message.data?.volume)
            case 'queue_add':
                return await handleQueueAdd(ws, message.data?.track)
            case 'queue_remove':
                return await handleQueueRemove(ws, message.data?.trackId)
            case 'queue_clear':
                return await handleQueueClear(ws)
            case 'track_next':
                return await handleTrackNext(ws)
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

const handlePlay = async (ws, position = 0) => {
    const room = await Room.findOneAndUpdate({ roomId: ws.roomId }, {
        $set: {
            'playback.isPlaying': true,
            'playback.currentTime': position,
            'playback.lastUpdated': new Date()
        }
    }, { new: true })

    // TODO: Enable sync session logging when needed
    // await SyncSession.logEvent(ws.roomId, 'play', ws.userId, ws.deviceId, { position })

    await broadcastToRoom(ws.roomId, {
        type: 'sync:play',
        data: {
            position,
            timestamp: Date.now(),
            initiatedBy: ws.userId
        }
    }, ws)
}

const handlePause = async (ws) => {
    const room = await Room.findOneAndUpdate({ roomId: ws.roomId }, {
        $set: {
            'playback.isPlaying': false,
            'playback.lastUpdated': new Date()
        }
    }, { new: true })

    // TODO: Enable sync session logging when needed
    // await SyncSession.logEvent(ws.roomId, 'pause', ws.userId, ws.deviceId)

    await broadcastToRoom(ws.roomId, {
        type: 'sync:pause',
        data: {
            timestamp: Date.now(),
            initiatedBy: ws.userId
        }
    }, ws)
}

const handleSeek = async (ws, position) => {
    if (typeof position !== 'number') throw new Error('Invalid position')

    const room = await Room.findOneAndUpdate({ roomId: ws.roomId }, {
        $set: {
            'playback.currentTime': position,
            'playback.lastUpdated': new Date()
        }
    }, { new: true })

    // TODO: Enable sync session logging when needed
    // await SyncSession.logEvent(ws.roomId, 'seek', ws.userId, ws.deviceId, { position })

    await broadcastToRoom(ws.roomId, {
        type: 'sync:seek',
        data: {
            position,
            timestamp: Date.now(),
            initiatedBy: ws.userId
        }
    }, ws)
}

const handleVolume = async (ws, volume) => {
    if (typeof volume !== 'number' || volume < 0 || volume > 100) {
        throw new Error('Invalid volume')
    }

    await broadcastToRoom(ws.roomId, {
        type: 'sync:volume',
        data: {
            volume,
            timestamp: Date.now(),
            initiatedBy: ws.userId
        }
    }, ws)
}

const handleQueueAdd = async (ws, track) => {
    if (!track?.url) throw new Error('Invalid track data')

    const room = await Room.findOneAndUpdate({ roomId: ws.roomId }, {
        $push: {
            queue: {
                ...track,
                addedBy: ws.userId,
                addedAt: new Date()
            }
        }
    }, { new: true })

    await broadcastToRoom(ws.roomId, {
        type: 'sync:queue_add',
        data: {
            track: {
                ...track,
                addedBy: ws.userId
            },
            timestamp: Date.now()
        }
    }, ws)
}

const handleQueueRemove = async (ws, trackId) => {
    const room = await Room.findOneAndUpdate({ roomId: ws.roomId }, {
        $pull: {
            queue: { _id: trackId }
        }
    }, { new: true })

    await broadcastToRoom(ws.roomId, {
        type: 'sync:queue_remove',
        data: {
            trackId,
            timestamp: Date.now(),
            initiatedBy: ws.userId
        }
    }, ws)
}

const handleQueueClear = async (ws) => {
    const room = await Room.findOneAndUpdate({ roomId: ws.roomId }, {
        $set: {
            queue: []
        }
    }, { new: true })

    await broadcastToRoom(ws.roomId, {
        type: 'sync:queue_clear',
        data: {
            timestamp: Date.now(),
            initiatedBy: ws.userId
        }
    }, ws)
}

const handleTrackNext = async (ws) => {
    const room = await Room.findOne({ roomId: ws.roomId })
    
    if (!room || room.queue.length === 0) {
        throw new Error('Queue is empty')
    }

    const nextTrack = room.queue[0]

    // Update current track and remove from queue
    const updatedRoom = await Room.findOneAndUpdate({ roomId: ws.roomId }, {
        $set: {
            currentTrack: nextTrack,
            'playback.currentTime': 0,
            'playback.isPlaying': true,
            'playback.lastUpdated': new Date()
        },
        $pop: {
            queue: -1  // Remove first item from queue
        }
    }, { new: true })

    await broadcastToRoom(ws.roomId, {
        type: 'sync:track_next',
        data: {
            track: nextTrack,
            queueLength: updatedRoom.queue.length,
            timestamp: Date.now(),
            initiatedBy: ws.userId
        }
    }, ws)
}

export const syncController = {
    handleSyncMessage
}