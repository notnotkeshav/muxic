// utils/socketRegistry.js
import { NotFoundError } from '../../errors/index.js'

class SocketRegistry {
    constructor() {
        this.rooms = new Map()         // roomId → Set<WebSocket>
        this.devices = new Map()       // deviceId → WebSocket
        this.userDevices = new Map()   // userId → Set<deviceId>
        this.connections = new Map()   // WebSocket → {userId, deviceId, roomId, socketId}
    }

    /**
     * Add or update a WebSocket connection in the registry
     * @param {WebSocket} ws - The WebSocket connection
     * @param {Object} params - Connection parameters
     * @param {string} params.userId - User ID
     * @param {string} params.deviceId - Device ID
     * @param {string|null} params.roomId - Room ID (optional)
     * @param {string} [params.socketId] - Unique socket identifier
     */
    addConnection(ws, { userId, deviceId, roomId, socketId }) {
        if (!userId || !deviceId) {
            throw new Error('userId and deviceId are required')
        }

        // Generate socketId if not provided
        const connectionId = socketId || this.generateSocketId()

        // Store/update connection info
        this.connections.set(ws, {
            userId,
            deviceId,
            roomId,
            socketId: connectionId,
            joinedAt: new Date()
        })

        // Update device mapping
        this.devices.set(deviceId, ws)

        // Update user's devices
        if (!this.userDevices.has(userId)) {
            this.userDevices.set(userId, new Set())
        }
        this.userDevices.get(userId).add(deviceId)

        // Add to room if specified
        if (roomId) {
            this.addToRoom(ws, roomId)
        }

        return connectionId
    }

    /**
     * Remove a WebSocket connection from the registry
     * @param {WebSocket} ws - The WebSocket connection to remove
     */
    removeConnection(ws) {
        const connection = this.connections.get(ws)
        if (!connection) return

        const { userId, deviceId, roomId } = connection

        // Remove from device map
        this.devices.delete(deviceId)

        // Remove from user's devices
        if (this.userDevices.has(userId)) {
            this.userDevices.get(userId).delete(deviceId)
            if (this.userDevices.get(userId).size === 0) {
                this.userDevices.delete(userId)
            }
        }

        // Remove from room
        if (roomId) {
            this.removeFromRoom(ws, roomId)
        }

        // Remove connection record
        this.connections.delete(ws)
    }

    /**
     * Add a connection to a specific room
     * @param {WebSocket} ws - The WebSocket connection
     * @param {string} roomId - Room ID to add to
     */
    addToRoom(ws, roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set())
        }
        this.rooms.get(roomId).add(ws)

        // Update connection's room
        const connection = this.connections.get(ws)
        if (connection) {
            connection.roomId = roomId
        }
    }

    /**
     * Remove a connection from a specific room
     * @param {WebSocket} ws - The WebSocket connection
     * @param {string} roomId - Room ID to remove from
     */
    removeFromRoom(ws, roomId) {
        const roomSockets = this.rooms.get(roomId)
        if (roomSockets) {
            roomSockets.delete(ws)
            if (roomSockets.size === 0) {
                this.rooms.delete(roomId)
            }
        }

        // Update connection's room
        const connection = this.connections.get(ws)
        if (connection && connection.roomId === roomId) {
            connection.roomId = null
        }
    }

    /**
     * Broadcast a message to all connections in a room
     * @param {string} roomId - Room ID to broadcast to
     * @param {string} event - Event type
     * @param {Object} data - Data payload
     * @param {WebSocket} [excludeWs] - WebSocket to exclude from broadcast
     */
    async broadcastToRoom(roomId, event, data, excludeWs = null) {
        if (!this.rooms.has(roomId)) {
            throw new NotFoundError(`Room ${roomId} not found`)
        }

        const message = JSON.stringify({
            event,
            data,
            timestamp: Date.now()
        })

        const promises = []
        const failedSockets = new Set()

        for (const ws of this.rooms.get(roomId)) {
            if (ws === excludeWs) continue

            try {
                if (ws.readyState === ws.OPEN) {
                    promises.push(
                        new Promise((resolve) => {
                            ws.send(message, (err) => {
                                if (err) {
                                    failedSockets.add(ws)
                                    console.error('Broadcast failed:', err)
                                }
                                resolve()
                            })
                        })
                    )
                } else {
                    failedSockets.add(ws)
                }
            } catch (err) {
                console.error('Broadcast error:', err)
                failedSockets.add(ws)
            }
        }

        await Promise.all(promises)

        // Clean up dead connections
        failedSockets.forEach(ws => {
            ws.terminate()
            this.removeConnection(ws)
        })
    }

    /**
     * Get all connections in a room
     * @param {string} roomId - Room ID
     * @returns {Set<WebSocket>} Set of WebSocket connections
     */
    getRoomConnections(roomId) {
        return this.rooms.get(roomId) || new Set()
    }

    /**
     * Get connection by device ID
     * @param {string} deviceId - Device ID
     * @returns {WebSocket|null} The WebSocket connection or null
     */
    getConnectionByDevice(deviceId) {
        return this.devices.get(deviceId) || null
    }

    /**
     * Get all devices for a user
     * @param {string} userId - User ID
     * @returns {Set<string>} Set of device IDs
     */
    getUserDevices(userId) {
        return this.userDevices.get(userId) || new Set()
    }

    /**
     * Generate a unique socket ID
     * @returns {string} Generated socket ID
     */
    generateSocketId() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
    }

    /**
     * Update connection properties
     * @param {WebSocket} ws - WebSocket connection
     * @param {Object} updates - Properties to update
     */
    updateConnection(ws, updates) {
        const connection = this.connections.get(ws)
        if (connection) {
            // Handle room changes
            if (updates.roomId !== undefined) {
                if (connection.roomId) {
                    this.removeFromRoom(ws, connection.roomId)
                }
                if (updates.roomId) {
                    this.addToRoom(ws, updates.roomId)
                }
            }

            // Update other properties
            this.connections.set(ws, { ...connection, ...updates })
        }
    }
}

export default new SocketRegistry()