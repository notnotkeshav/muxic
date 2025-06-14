import Device from '../models/device.model.js'
// import { roomController } from '../controllers/websocket/room.controller.js'
// import { syncController } from '../controllers/websocket/sync.controller.js'
import { setupHeartbeat } from '../utils/websocket/heartbeat.js'
import { handleError, handleDisconnect } from '../utils/websocket/handlers.js'
import { randomUUID } from 'crypto'


export const handleRoutes = async (ws) => {
    try {
        await Device.findByIdAndUpdate(ws.deviceId, {
            isOnline: true,
            socketId: randomUUID(),
            lastActive: new Date()
        })

        setupHeartbeat(ws)

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data)

                if (!message?.type?.includes(':')) throw new Error('Malformed message type')

                switch (message.type.split(':')[0]) {
                    case 'room':
                        // return await roomController.handleRoomMessage(ws, message)
                    case 'sync':
                        // return await syncController.handleSyncMessage(ws, message)
                    default:
                        throw new Error('Invalid message type')
                }
            } catch (err) {
                handleError(ws, err)
            }
        })

        ws.on('error', (err) => handleError(ws, err))

        ws.on('close', () => handleDisconnect(ws))

    } catch (err) {
        handleError(ws, err)
        ws.close(1008, 'Connection setup failed')
    }
}
