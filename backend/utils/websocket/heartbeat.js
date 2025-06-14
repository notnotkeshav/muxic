export const setupHeartbeat = (ws) => {
    ws.isAlive = true

    ws.on('pong', () => {
        ws.isAlive = true
    })

    const interval = setInterval(() => {
        if (!ws.isAlive) return ws.terminate()

        ws.isAlive = false
        ws.ping()
    }, 30000)

    ws.on('close', () => {
        clearInterval(interval)
    })
}