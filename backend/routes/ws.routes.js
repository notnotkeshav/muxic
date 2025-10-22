import Device from '../models/device.model.js'
import { handleRoomMessage, handleSyncMessage, handlePresenceMessage } from '../controllers/websocket/index.js'
import { setupHeartbeat } from '../utils/websocket/heartbeat.js'
import { handleError, handleDisconnect } from '../utils/websocket/handlers.js'
import { randomUUID } from 'crypto'


export const handleRoutes = async (ws) => {
    try {
        const socketId = randomUUID()
        await Device.findByIdAndUpdate(ws.deviceId, {
            isOnline: true,
            socketId,
            lastActive: new Date()
        })

        ws.socketId = socketId
        setupHeartbeat(ws)

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data)

                if (!message?.type) throw new Error('Message must contain type field')
                if (!message?.action) throw new Error('Message must contain action field')

                switch (message.type) {
                    case 'presence':
                        await handlePresenceMessage(ws, message)
                        break
                    case 'room':
                        await handleRoomMessage(ws, message)
                        break
                    case 'sync':
                        await handleSyncMessage(ws, message)
                        break
                    default:
                        throw new Error(`Invalid message type: ${message.type}`)
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
