import http from "http"
import { WebSocketServer } from "ws"
import { configureApp, app } from "./app.js"
import { wsConfig } from "./config/index.js"
import { wsAuth } from "./middlewares/wsAuth.js"
import { handleRoutes } from "./routes/ws.routes.js"
import SocketRegistry from "./utils/websocket/SocketRegistry.js"

const PORT = process.env.PORT || 3001

const startServer = async () => {
    try {
        await configureApp()

        const server = http.createServer(app)

        const wss = new WebSocketServer({
            server,
            path: wsConfig.path
        })

        wss.on('connection', async (ws, req) => {
            try {
                // 1. Authenticate
                await wsAuth(ws, req)

                // 2. Register connection
                const roomId = new URL(req.url, `ws://${req.headers.host}`).searchParams.get('roomId')
                
                SocketRegistry.addConnection(ws, {
                    userId: ws.userId,
                    deviceId: ws.deviceId,
                    roomId: roomId || null
                })

                // 3. Handle connection
                await handleRoutes(ws)

            } catch (err) {
                ws.close(1008, err.message)
            }
        })

        server.listen(process.env.PORT, () => {
            console.log(`Server running on port http://localhost:${PORT}`)
            console.log(`WebSocket endpoint: ws://localhost:${PORT}${wsConfig.path}`)
        })

    } catch (err) {
        console.error("Failed to start server:", err)
        process.exit(1)
    }
}

startServer()