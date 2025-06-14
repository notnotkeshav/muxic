import jwt from 'jsonwebtoken'
import Device from '../models/device.model.js'

export const wsAuth = async (ws, req) => {
  const token = new URL(req.url, `ws://${req.headers.host}`).searchParams.get('token')
  let decoded
  if (!token) throw new Error('Authentication required')

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new Error('Session expired')
    throw err
  }

  const device = await Device.findOne({
    _id: decoded.deviceId,
    userId: decoded.userId
  })

  if (!device) throw new Error('Device not registered')

  ws.userId = decoded.userId
  ws.deviceId = decoded.deviceId
}