import { Router } from "express"
import authRouter from "./auth.routes.js"
import roomRouter from "./room.routes.js"

const router = Router()

router.use('/auth', authRouter)
router.use('/rooms', roomRouter)

router.get('/', (req, res) => {
    res.send("Server running gracefully!!")
})

export default router