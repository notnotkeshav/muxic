import { Router } from "express"
import {
  deleteAccountController,
  forgotPasswordController,
  getOTPController,
  getUserDetailsController,
  googleCallbackController,
  googleLoginController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resetPasswordController,
  verifyOTPController
} from "../controllers/auth.controller.js"

import { validate } from '../middlewares/validate.js'
import { loginLimiter, otpLimiter, resetPasswordLimiter } from "../middlewares/rateLimit.js"
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { forgotPasswordSchema, getOTPSchema, googleCallbackQuerySchema, loginSchema, registerSchema, resetPasswordSchema, verifyOTPSchema } from "../validations/auth.schema.js"

const authRouter = Router()

authRouter.post('/register', validate(registerSchema), registerController)
authRouter.post('/login', loginLimiter, validate(loginSchema), loginController)

authRouter.get('/otp', authMiddleware, otpLimiter, validate(getOTPSchema, 'query'), getOTPController)
authRouter.post('/verify', otpLimiter, validate(verifyOTPSchema), verifyOTPController)

authRouter.put('/forgot-password', validate(forgotPasswordSchema), forgotPasswordController)
authRouter.put('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), resetPasswordController)

authRouter.get('/user', getUserDetailsController)
authRouter.post('/refresh', refreshTokenController)
authRouter.post('/logout', authMiddleware, logoutController)
authRouter.delete('/delete', authMiddleware, deleteAccountController)

authRouter.get('/google', googleLoginController)
authRouter.get('/google/callback', validate(googleCallbackQuerySchema, 'query'), googleCallbackController)

export default authRouter