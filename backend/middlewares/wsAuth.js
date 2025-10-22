import jwt from 'jsonwebtoken'
import Device from '../models/device.model.js'
import { UnauthorizedError } from '../errors/index.js'

export const wsAuth = async (ws, req) => {
  const token = new URL(req.url, `ws://${req.headers.host}`).searchParams.get('token')
  
  if (!token) throw new UnauthorizedError('Authentication required')

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const device = await Device.findOne({
      _id: decoded.deviceId,
      userId: decoded.userId
    })

    if (!device) throw new UnauthorizedError('Device not registered')

    // Attach to WebSocket object
    ws.userId = decoded.userId
    ws.deviceId = decoded.deviceId
    ws.deviceType = device.deviceType

    return decoded

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Session expired')
    }
    throw err
  }
}