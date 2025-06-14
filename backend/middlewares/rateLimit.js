import rateLimit from 'express-rate-limit'

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many OTP verification attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Too many password reset attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const roomCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many room creation attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const roomJoinLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many room join attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const roomDeletionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Too many room deletion attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const userRoomRequestLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: 'Too many requests for user rooms. Please try again later.'
    }
})