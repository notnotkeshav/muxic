// backend/controllers/auth.controller.js
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import axios from 'axios'
import { RefreshToken, User, UserStats, Device, Room, SyncSession } from '../models/index.js'
import { sendEmail } from '../config/index.js'

// Constants
const CLIENT_ID = process.env.NODE_ENV === 'development'
    ? process.env.GOOGLE_CLIENT_ID
    : process.env.GOOGLE_CLIENT_ID_PROD
const CLIENT_SECRET = process.env.NODE_ENV === 'development'
    ? process.env.GOOGLE_CLIENT_SECRET
    : process.env.GOOGLE_CLIENT_SECRET_PROD
const REDIRECT_URI = process.env.NODE_ENV === 'development'
    ? process.env.GOOGLE_REDIRECT_URI
    : process.env.GOOGLE_REDIRECT_URI_PROD
const CLIENT_URL = process.env.NODE_ENV === 'development'
    ? process.env.DEV_URL
    : process.env.CLIENT_URL

// ======================
// HELPER FUNCTIONS
// ======================

/**
 * Generate JWT token
 */
const generateToken = (userId, extraPayload = {}) => {
    return jwt.sign(
        { userId, ...extraPayload },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    )
}

/**
 * Generate and store refresh token
 */
const generateRefreshToken = async (userId) => {
    const token = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await RefreshToken.create({
        userId,
        token,
        expiresAt,
        createdAt: new Date(),
        lastUsed: new Date()
    })

    return token
}

/**
 * Set token cookies in response
 */
const setTokenCookies = (res, token, refreshToken) => {
    const isProduction = process.env.NODE_ENV === 'production'
    const sameSite = isProduction ? 'none' : 'lax'

    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
    }

    res.cookie('token', token, cookieOptions)
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    })
}

/**
 * Get device information from request
 */
const getDeviceInfo = (req) => {
    const fallback = 'Unknown'
    const ua = req.useragent || {}

    return {
        platform: ua.platform || fallback,
        browser: ua.browser || fallback,
        os: ua.os || fallback,
        version: ua.version || fallback,
        deviceType: getDeviceType(ua),
        userAgentString: req.headers['user-agent'] || ''
    }
}

/**
 * Determine device type
 */
const getDeviceType = (ua) => {
    if (!ua) return 'other'
    if (ua.isMobile) return 'mobile'
    if (ua.isTablet) return 'tablet'
    if (ua.isDesktop) return 'desktop'
    if (ua.isSmartTV) return 'smart_tv'
    if (ua.isBot) return 'bot'
    return 'other'
}

/**
 * Handle device management (create or update)
 */
const handleDevice = async (userId, req) => {
    const deviceInfo = getDeviceInfo(req)
    const deviceName = `${deviceInfo.platform} ${deviceInfo.browser}`.trim()

    let device = await Device.findOne({
        userId: userId,
        deviceName: deviceName
    })

    if (!device) {
        device = await Device.create({
            userId: userId,
            deviceId: crypto.randomUUID(),
            deviceName: deviceName,
            deviceType: deviceInfo.deviceType,
            platform: deviceInfo.platform,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            version: deviceInfo.version,
            isOnline: true,
            userAgent: deviceInfo.userAgentString,
            lastActive: new Date()
        })
    } else {
        device.isOnline = true
        device.lastActive = new Date()
        await device.save()
    }

    return device
}

/**
 * Generate unique username
 */
const generateUniqueUsername = async (baseName) => {
    let username = baseName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 20)

    while (username.length < 5) {
        username += Math.floor(Math.random() * 10)
    }

    let isUnique = false
    let counter = 1
    let finalUsername = username

    while (!isUnique) {
        const existing = await User.findOne({ username: finalUsername })
        if (!existing) {
            isUnique = true
        } else {
            const suffix = String(counter)
            const baseLength = 20 - suffix.length
            finalUsername = username.substring(0, baseLength) + suffix
            counter++
        }
    }

    return finalUsername
}

/**
 * Send email asynchronously with error handling
 */
const sendEmailAsync = async (email, type, ...args) => {
    try {
        const result = await sendEmail(email, type, ...args)
        if (!result.success) {
            console.error(`Email (${type}) send failed:`, result.error)
        }
    } catch (err) {
        console.error(`Async email (${type}) error:`, err)
    }
}

// ======================
// CONTROLLERS
// ======================

/**
 * Register new user
 */
const registerController = async (req, res) => {
    try {
        const { email, password, username, fullName } = req.validated

        // Check existing user
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: username }
            ]
        })

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.email === email.toLowerCase()
                    ? 'Email already registered'
                    : 'Username already taken'
            })
        }

        // Create user with OTP
        const user = new User({
            email: email.toLowerCase(),
            password,
            username,
            fullName,
            otp: {
                code: User.generateOTP(),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
            }
        })

        await user.save()
        await UserStats.initializeUserStats(user._id)

        // Send verification email (async)
        sendEmailAsync(user.email, 'verification', user.otp.code, user.username, user._id)

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for verification code.',
            data: {
                userId: user._id,
                email: user.email,
                username: user.username
            }
        })

    } catch (error) {
        console.error('Register error:', error)

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message)
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            })
        }

        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        })
    }
}

/**
 * Verify OTP and complete registration
 */
const verifyOTPController = async (req, res) => {
    try {
        const { userId, otp } = req.validated
        const user = await User.findById(userId).select('+otp.code +otp.expiresAt')

        // Validate user and OTP
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })
        if (user.isVerified) return res.status(400).json({ success: false, message: 'Account already verified' })
        if (!user.otp?.code || user.otp.code !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP code' })
        if (user.otp.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'OTP code has expired' })

        // Complete verification
        user.isVerified = true
        user.otp = undefined
        await user.save()

        // Create device and tokens
        const device = await handleDevice(user._id, req)
        const token = generateToken(user._id, { deviceId: device._id })
        const refreshToken = await generateRefreshToken(user._id)
        setTokenCookies(res, token, refreshToken)

        // Send welcome email (async)
        sendEmailAsync(user.email, 'welcome', user.username)

        res.status(200).json({
            success: true,
            message: 'Email verified successfully!',
            data: {
                user: user.toAuthJSON(),
                token,
                refreshToken
            }
        })

    } catch (error) {
        console.error('Verify OTP error:', error)
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        })
    }
}

/**
 * User login
 */
const loginController = async (req, res) => {
    try {
        const { identifier, password } = req.validated
        const user = await User.findByCredentials(identifier)

        // Validate credentials
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }
        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: `Account suspended${user.banReason ? `: ${user.banReason}` : ''}`
            })
        }
        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account deactivated' })
        }

        // Update last login and create device
        user.lastLogin = new Date()
        await user.save()
        const device = await handleDevice(user._id, req)

        // Generate tokens
        const token = generateToken(user._id, { deviceId: device._id })
        const refreshToken = await generateRefreshToken(user._id)
        setTokenCookies(res, token, refreshToken)

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toAuthJSON(),
                token,
                refreshToken
            }
        })

    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ success: false, message: 'Login failed' })
    }
}

/**
 * Request password reset
 */
const forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.validated
        const user = await User.findOne({ email: email.toLowerCase() })

        if (user) {
            // Generate reset token
            user.resetPasswordToken = crypto.randomBytes(32).toString('hex')
            user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
            await user.save()

            // Send reset email (async)
            sendEmailAsync(user.email, 'resetPassword', user.resetPasswordToken, user.username)
        }

        // Always return success to prevent email enumeration
        res.status(200).json({
            success: true,
            message: 'If the email exists, a password reset link has been sent.'
        })

    } catch (error) {
        console.error('Forgot password error:', error)
        res.status(500).json({ success: false, message: 'Failed to process request' })
    }
}

/**
 * Complete password reset
 */
const resetPasswordController = async (req, res) => {
    try {
        const { token, password } = req.validated
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('+resetPasswordToken +resetPasswordExpires')

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' })
        }

        // Update password and clear reset token
        user.password = password
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined
        await user.save()

        res.status(200).json({ success: true, message: 'Password reset successful' })

    } catch (error) {
        console.error('Reset password error:', error)
        res.status(500).json({ success: false, message: 'Password reset failed' })
    }
}

/**
 * Request new OTP
 */
const getOTPController = async (req, res) => {
    try {
        const { userId } = req.validated
        const user = await User.findById(userId).select('+otp.code +otp.expiresAt')

        // Validate user
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })
        if (user.isVerified) return res.status(400).json({ success: false, message: 'Account already verified' })

        // Check OTP request rate limit
        const now = new Date()
        const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000)
        if (user.otp?.expiresAt && user.otp.expiresAt > twoMinutesFromNow) {
            const timeLeft = Math.ceil((user.otp.expiresAt - now) / 1000 / 60)
            return res.status(429).json({
                success: false,
                message: `Please wait ${timeLeft} more minute(s) before requesting a new OTP`
            })
        }

        // Check recent OTP requests
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
        if (user.otpRequestedAt && user.otpRequestedAt > oneMinuteAgo) {
            return res.status(429).json({
                success: false,
                message: 'Please wait at least 1 minute between OTP requests'
            })
        }

        // Generate new OTP
        const newOtp = User.generateOTP()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        user.otp = { code: newOtp, expiresAt: otpExpires }
        user.otpRequestedAt = now
        await user.save()

        // Send OTP email (async)
        sendEmailAsync(user.email, 'verification', newOtp, user.username, user._id)

        res.status(200).json({
            success: true,
            message: 'New verification code sent',
            data: {
                userId: user._id,
                email: user.email,
                otpExpiresAt: otpExpires,
            }
        })

    } catch (error) {
        console.error('Get OTP error:', error)
        res.status(500).json({ success: false, message: 'Failed to send OTP' })
    }
}

/**
 * Refresh access token
 */
const refreshTokenController = async (req, res) => {
    const incomingToken = req.cookies.refreshToken
    if (!incomingToken) {
        return res.status(401).json({ success: false, message: 'Refresh token missing' })
    }

    try {
        const existing = await RefreshToken.findOne({ token: incomingToken })
        if (!existing) {
            return res.status(403).json({ success: false, message: 'Invalid refresh token' })
        }

        // Find or create device
        const device = await Device.findOne({
            userId: existing.userId,
            deviceName: `${req.useragent.platform} ${req.useragent.browser}`
        }) || await handleDevice(existing.userId, req)

        // Rotate refresh token
        await RefreshToken.deleteOne({ _id: existing._id })
        const newRefreshToken = await generateRefreshToken(existing.userId)
        const newAccessToken = generateToken(existing.userId, { deviceId: device._id })

        setTokenCookies(res, newAccessToken, newRefreshToken)

        res.status(200).json({
            success: true,
            token: newAccessToken,
            refreshToken: newRefreshToken
        })

    } catch (err) {
        console.error('Refresh error:', err)
        res.status(500).json({ success: false, message: 'Token refresh failed' })
    }
}

/**
 * User logout
 */
const logoutController = async (req, res) => {
    const token = req.cookies.refreshToken
    const deviceId = req.deviceId

    try {
        if (token) await RefreshToken.deleteOne({ token })
        if (deviceId) {
            await Device.findByIdAndUpdate(deviceId, {
                isOnline: false,
                socketId: null,
                lastActive: new Date()
            })
        }
    } catch (error) {
        console.error('Logout cleanup error:', error)
    }

    res.clearCookie('token')
    res.clearCookie('refreshToken')
    res.status(200).json({ success: true, message: 'Logged out successfully' })
}

/**
 * Delete user account
 */
const deleteAccountController = async (req, res) => {
    const userId = req.userId

    try {
        // Delete user devices
        await Device.deleteMany({ userId })

        // Handle rooms created by user
        const roomsCreated = await Room.find({ createdBy: userId }).select('_id')
        const roomIdsCreated = roomsCreated.map(room => room._id)

        await Room.deleteMany({ createdBy: userId })
        await SyncSession.deleteMany({ roomId: { $in: roomIdsCreated } })

        // Remove user from participant lists
        await Room.updateMany(
            { 'participants.user': userId },
            { $pull: { participants: { user: userId } } }
        )

        // Delete user account
        await User.findByIdAndDelete(userId)

        res.status(200).json({ message: 'Account deleted successfully' })
    } catch (error) {
        console.error('Account deletion error:', error)
        res.status(500).json({ error: 'Failed to delete account' })
    }
}

/**
 * Get user details
 */
const getUserDetailsController = async (req, res) => {
    try {
        const { userId } = req.query
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID required' })
        }

        const [user, userStats] = await Promise.all([
            User.findById(userId),
            UserStats.findOne({ userId })
        ])

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        res.status(200).json({
            success: true,
            data: {
                user: user.toObject(),
                stats: userStats ? userStats.toObject() : null
            }
        })

    } catch (error) {
        console.error('User details error:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

/**
 * Initiate Google OAuth flow
 */
const googleLoginController = (req, res) => {
    if (!CLIENT_ID || !REDIRECT_URI) {
        return res.status(500).json({ message: 'Google login unavailable' })
    }

    const state = crypto.randomUUID()
    res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
    })

    const url = `https://accounts.google.com/o/oauth2/v2/auth?state=${state}&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email&prompt=select_account`
    res.redirect(url)
}

/**
 * Handle Google OAuth callback
 */
const googleCallbackController = async (req, res) => {
    const { code, state } = req.query
    const storedState = req.cookies.oauth_state

    if (!state || state !== storedState) {
        console.warn('Invalid OAuth state')
        return res.redirect(`${CLIENT_URL}/auth/error?message=Invalid+OAuth+state`)
    }

    res.clearCookie('oauth_state')

    try {
        // Exchange code for tokens
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        })

        // Get user profile
        const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
        })

        const googleUser = profileResponse.data
        if (!googleUser?.id) {
            throw new Error('Google authentication failed')
        }

        // Find or create user
        let user = await User.findOne({ googleId: googleUser.id })
        if (!user) {
            const existingUser = await User.findOne({ email: googleUser.email })

            if (existingUser) {
                // Link Google account to existing user
                existingUser.googleId = googleUser.id
                existingUser.isVerified = true
                if (!existingUser.avatar && googleUser.picture) {
                    existingUser.avatar = googleUser.picture
                }
                user = await existingUser.save()
            } else {
                // Create new user
                user = new User({
                    email: googleUser.email,
                    username: await generateUniqueUsername(googleUser.name || googleUser.email),
                    fullName: googleUser.name || googleUser.email.split('@')[0],
                    avatar: googleUser.picture,
                    googleId: googleUser.id,
                    isVerified: true
                })
                await user.save()
                await UserStats.initializeUserStats(user._id)
                sendEmailAsync(user.email, 'welcome', user.username)
            }
        }

        // Update last login
        user.lastLogin = new Date()
        await user.save()

        // Handle device
        const device = await handleDevice(user._id, req)

        // Generate tokens
        const token = generateToken(user._id, {
            ...user.toAuthJSON(),
            deviceId: device._id
        })
        const refreshToken = await generateRefreshToken(user._id)
        setTokenCookies(res, token, refreshToken)

        res.redirect(`${CLIENT_URL}/auth/success?token=${token}`)

    } catch (error) {
        console.error('Google callback error:', error.response?.data || error.message)
        res.redirect(`${CLIENT_URL}/auth/error?message=Authentication failed`)
    }
}

// ======================
// EXPORTS
// ======================

export {
    registerController,
    loginController,
    verifyOTPController,
    forgotPasswordController,
    resetPasswordController,
    refreshTokenController,
    logoutController,
    deleteAccountController,
    googleLoginController,
    googleCallbackController,
    getOTPController,
    getUserDetailsController
}