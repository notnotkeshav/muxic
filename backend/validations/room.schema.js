import { z } from 'zod'

export const createRoomSchema = z.object({
    name: z.string()
        .min(3, 'Room name must be at least 3 characters')
        .max(50, 'Room name cannot exceed 50 characters'),
    description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
    settings: z.object({
        isPublic: z.boolean().default(false),
        requiresPassword: z.boolean().default(false),
        password: z.string().optional(),
        maxParticipants: z.number().min(2).max(50).default(10),
        allowGuestControl: z.boolean().default(false),
        autoPlay: z.boolean().default(true)
    }).optional()
})

export const joinRoomSchema = z.object({
    roomId: z.string(),
    password: z.string().optional()
})

export const leaveRoomSchema = z.object({
    roomId: z.string()
})

export const playbackStateSchema = z.object({
  isPlaying: z.boolean(),
  currentTime: z.number().min(0).optional(),
  volume: z.number().min(0).max(100).optional()
})

export const trackSchema = z.object({
  title: z.string().min(1),
  artist: z.string().optional(),
  album: z.string().optional(),
  duration: z.number().min(0),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  source: z.enum(['local', 'other']).default('other')
})

export const queueItemSchema = z.object({
  title: z.string().min(1),
  artist: z.string().optional(),
  album: z.string().optional(),
  duration: z.number().min(0),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  source: z.enum(['local', 'other']).default('other')
})