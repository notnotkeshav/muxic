import SocketRegistry from '../../utils/websocket/SocketRegistry.js'
import { NotFoundError } from '../../errors/index.js'

/**
 * Broadcast a message to all participants in a room
 * @param {string} roomId - The ID of the room to broadcast to
 * @param {Object} message - The message to broadcast
 * @param {string} message.type - The message type/event name
 * @param {Object} message.data - The message payload
 * @param {WebSocket} [excludeWs] - WebSocket connection to exclude from broadcast
 * @returns {Promise<void>}
 */
export const broadcastToRoom = async (roomId, message, excludeWs = null) => {
    try {
        // Get all connections in the room
        const connections = SocketRegistry.getRoomConnections(roomId)

        if (!connections) {
            throw new NotFoundError(`Room ${roomId} not found`)
        }

        const messageString = JSON.stringify({
            ...message,
            timestamp: Date.now()
        })

        const promises = []
        const failedSockets = new Set()

        // Broadcast to all connections in parallel
        for (const ws of connections) {
            // Skip excluded socket and closed connections
            if (ws === excludeWs || ws.readyState !== ws.OPEN) {
                if (ws.readyState !== ws.OPEN) {
                    failedSockets.add(ws)
                }
                continue
            }

            promises.push(
                new Promise((resolve) => {
                    ws.send(messageString, (err) => {
                        if (err) {
                            console.error('Broadcast failed to WS:', ws.socketId, err)
                            failedSockets.add(ws)
                        }
                        resolve()
                    })
                })
            )
        }

        await Promise.all(promises)

        // Clean up failed connections
        if (failedSockets.size > 0) {
            console.warn(`Cleaning up ${failedSockets.size} failed connections`)
            failedSockets.forEach(ws => {
                ws.terminate()
                SocketRegistry.removeConnection(ws)
            })
        }

    } catch (error) {
        console.error('Broadcast error:', error)
        throw error
    }
}

/**
 * Send a message to a specific device
 * @param {string} deviceId - The target device ID
 * @param {Object} message - The message to send
 * @returns {Promise<boolean>} True if sent successfully
 */
export const sendToDevice = async (deviceId, message) => {
    const ws = SocketRegistry.getConnectionByDevice(deviceId)
    if (!ws || ws.readyState !== ws.OPEN) return false

    try {
        await new Promise((resolve, reject) => {
            ws.send(JSON.stringify(message), (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        return true
    } catch (error) {
        console.error('Failed to send to device:', deviceId, error)
        return false
    }
}

/**
 * Send a message to all devices of a specific user
 * @param {string} userId - The target user ID
 * @param {Object} message - The message to send
 * @returns {Promise<number>} Number of devices successfully notified
 */
export const broadcastToUser = async (userId, message) => {
    const deviceIds = Array.from(SocketRegistry.getUserDevices(userId))
    let successCount = 0

    await Promise.all(
        deviceIds.map(async (deviceId) => {
            const sent = await sendToDevice(deviceId, message)
            if (sent) successCount++
        })
    )
    return successCount
}