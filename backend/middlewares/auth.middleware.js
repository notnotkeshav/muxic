import jwt from 'jsonwebtoken'

export const authMiddleware = (req, res, next) => {
    const token = req.cookies?.token
    const JWT_SECRET = process.env.JWT_SECRET

    if (!token) {
        return res.status(401).json({ error: 'Authentication token missing' })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        req.userId = decoded.userId
        req.deviceId = decoded.deviceId
        next()
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' })
    }
}