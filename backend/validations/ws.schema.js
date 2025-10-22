// validations/ws.schema.js
import { z } from 'zod'

// Base message schema
const baseMessageSchema = z.object({
    type: z.string().min(1, "Message type is required"),
    action: z.string().min(1, "Action is required"),
    data: z.record(z.any()).optional()
})

// Room actions
const roomMessageSchema = baseMessageSchema.extend({
    type: z.literal('room'),
    action: z.enum(['join', 'leave', 'create', 'update']),
    data: z.object({
        roomId: z.string().min(1, "Room ID is required").optional(),
        name: z.string().min(3).max(50).optional(),
        settings: z.object({
            isPublic: z.boolean().optional(),
            maxParticipants: z.number().min(2).max(50).optional()
        }).optional()
    }).optional()
})

const syncMessageSchema = baseMessageSchema.extend({
    type: z.literal('sync'),
    action: z.enum(['play', 'pause', 'seek', 'volume', 'next', 'queue_add', 'queue_remove', 'queue_clear']),
    data: z.object({
        position: z.number().min(0).optional(),
        volume: z.number().min(0).max(100).optional(),
        track: z.object({
            url: z.string().url(),
            title: z.string().min(1),
            duration: z.number().min(0)
        }).optional(),
        trackId: z.string().optional()
    }).optional()
})

// Presence actions
const presenceMessageSchema = baseMessageSchema.extend({
    type: z.literal('presence'),
    action: z.enum(['join', 'leave', 'heartbeat']),
    data: z.object({
        roomId: z.string().min(1).optional()
    }).optional()
})

// Combined validation
export const validateWsMessage = (rawMessage) => {
    try {
        const message = typeof rawMessage === 'string'
            ? JSON.parse(rawMessage)
            : rawMessage

        // Determine which schema to use based on message type
        switch (message.type) {
            case 'room':
                return roomMessageSchema.parse(message)
            case 'sync':
                return syncMessageSchema.parse(message)
            case 'presence':
                return presenceMessageSchema.parse(message)
            default:
                throw new Error(`Invalid message type: ${message.type}`)
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Format Zod errors into a more readable format
            const formattedErrors = error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            }))
            throw new Error(JSON.stringify({
                type: 'validation_error',
                errors: formattedErrors
            }))
        }
        throw error
    }
}

// Type schemas for reference
export const wsSchemas = {
    room: roomMessageSchema,
    sync: syncMessageSchema,
    presence: presenceMessageSchema
}