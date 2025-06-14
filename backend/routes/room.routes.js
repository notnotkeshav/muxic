import { Router } from 'express'
import { createRoom, joinRoom, getRoomDetails, leaveRoom, deleteRoom, getUserRooms, updatePlaybackState, setCurrentTrack, skipTrack, addToQueue, removeFromQueue, clearQueue } from '../controllers/room.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.js'
import { createRoomSchema, joinRoomSchema, leaveRoomSchema, playbackStateSchema, queueItemSchema, trackSchema } from '../validations/room.schema.js'
import { roomCreationLimiter, roomDeletionLimiter, roomJoinLimiter, userRoomRequestLimiter } from '../middlewares/rateLimit.js'

const roomRouter = Router()
roomRouter.use(authMiddleware)

roomRouter.post('/', roomCreationLimiter, validate(createRoomSchema), createRoom)
roomRouter.post('/join', roomJoinLimiter, validate(joinRoomSchema), joinRoom)

roomRouter.get('/:roomId', getRoomDetails)
roomRouter.post('/leave', validate(leaveRoomSchema), leaveRoom)
roomRouter.delete('/:roomId', roomDeletionLimiter, deleteRoom)

roomRouter.get('/user/rooms', userRoomRequestLimiter, getUserRooms)

// Playback control routes
roomRouter.put('/:roomId/playback', validate(playbackStateSchema), updatePlaybackState)
roomRouter.post('/:roomId/playback/next', skipTrack)
roomRouter.put('/:roomId/track', validate(trackSchema), setCurrentTrack)

// Queue control routes
roomRouter.post('/:roomId/queue', validate(queueItemSchema), addToQueue)
roomRouter.delete('/:roomId/queue/:index', removeFromQueue)
roomRouter.delete('/:roomId/queue', clearQueue)

export default roomRouter