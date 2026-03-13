import { Room } from '../models/index.js'
import { NotFoundError, ForbiddenError } from '../errors/index.js'

export const createRoom = async (req, res) => {
  try {

    const value = req.validated

    const roomId = Room.generateRoomId()
    const room = new Room({
      roomId,
      name: value.name,
      description: value.description || '',
      createdBy: req.userId,
      admins: [req.userId],
      settings: {
        ...value.settings,
        password: value.settings?.requiresPassword ? value.settings.password : undefined
      }
    })

    await room.save()

    // Add creator as first participant
    await room.addParticipant(req.userId, 'admin')

    res.status(201).json({
      success: true,
      room: {
        id: room._id,
        roomId: room.roomId,
        name: room.name,
        settings: room.settings
      }
    })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to create room' })
  }
}

export const joinRoom = async (req, res) => {
  try {
    const value = req.validated

    const room = await Room.findOne({ roomId: value.roomId, isActive: true })
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    if (room.settings.requiresPassword && room.settings.password !== value.password) {
      return res.status(403).json({ error: 'Invalid password' })
    }

    // Check if room is full
    if (room.participants.length >= room.settings.maxParticipants) {
      return res.status(403).json({ error: 'Room is full' })
    }

    // Add user to participants if not already there
    await room.addParticipant(req.userId)

    res.json({
      success: true,
      room: {
        id: room._id,
        roomId: room.roomId,
        name: room.name,
        currentTrack: room.currentTrack,
        playback: room.playback,
        queue: room.queue
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to join room' })
  }
}

export const getRoomDetails = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('createdBy', 'username avatar')
      .populate('participants.user', 'username avatar')

    console.log(room)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      p => p.user._id.toString() === req.userId.toString()
    )

    if (!isParticipant && !room.settings.isPublic) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        createdBy: room.createdBy,
        currentTrack: room.currentTrack,
        playback: room.playback,
        queue: room.queue,
        participants: room.participants,
        settings: room.settings
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to get room details' })
  }
}

export const leaveRoom = async (req, res, next) => {
  try {
    const { roomId } = req.validated
    const userId = req.userId

    const room = await Room.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    // Check if user is the creator (can't leave, must delete)
    if (room.createdBy.toString() === userId.toString()) {
      throw new ForbiddenError('Room creator cannot leave, must delete the room instead')
    }

    // Remove participant
    await room.removeParticipant(userId)

    res.status(200).json({
      success: true,
      message: 'Successfully left the room'
    })
  } catch (error) {
    next(error)
  }
}

export const deleteRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params
    const userId = req.userId

    const room = await Room.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    // Check if user is the creator or admin
    const isAdmin = room.admins.some(adminId => adminId.toString() === userId.toString())
    if (room.createdBy.toString() !== userId.toString() && !isAdmin) {
      throw new ForbiddenError('Only room admins can delete the room')
    }

    // Soft delete by setting isActive to false
    room.isActive = false
    await room.save()

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const getUserRooms = async (req, res, next) => {
  try {
    const userId = req.userId

    const rooms = await Room.findUserRooms(userId)
      .select('name description participants settings currentTrack playback isActive')

    res.status(200).json({
      success: true,
      data: rooms
    })
  } catch (error) {
    next(error)
  }
}

export const updatePlaybackState = async (req, res, next) => {
  try {
    const { roomId } = req.params
    const playbackState = req.validated
    const userId = req.userId

    const room = await Room.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    // Check if user is admin or participant with control rights
    const participant = room.participants.find(p => p.user.toString() === userId.toString())
    const canControl = participant &&
      (participant.role === 'admin' ||
        (room.settings.allowGuestControl && participant.role === 'participant'))

    if (!canControl) {
      throw new ForbiddenError('You do not have permission to control playback')
    }

    await room.updatePlayback(playbackState)

    res.status(200).json({
      success: true,
      message: 'Playback state updated',
      playback: room.playback
    })
  } catch (error) {
    next(error)
  }
}

export const skipTrack = async (req, res, next) => {
  try {
    const { roomId } = req.params
    const userId = req.userId

    const room = await Room.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    // Check if user is admin or participant with control rights
    const participant = room.participants.find(p => p.user.toString() === userId.toString())
    const canControl = participant &&
      (participant.role === 'admin' ||
        (room.settings.allowGuestControl && participant.role === 'participant'))

    if (!canControl) {
      throw new ForbiddenError('You do not have permission to skip tracks')
    }

    await room.nextTrack()

    res.status(200).json({
      success: true,
      message: 'Track skipped',
      currentTrack: room.currentTrack,
      queue: room.queue
    })
  } catch (error) {
    next(error)
  }
}

export const setCurrentTrack = async (req, res, next) => {
  try {
    const { roomId } = req.params
    const track = req.validated
    const userId = req.userId

    const room = await Room.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    // Only admins can manually set tracks
    const isAdmin = room.participants.some(
      p => p.user.toString() === userId.toString() && p.role === 'admin'
    )

    if (!isAdmin) {
      throw new ForbiddenError('Only room admins can manually set tracks')
    }

    room.currentTrack = track
    room.playback.isPlaying = true
    room.playback.currentTime = 0
    await room.save()

    res.status(200).json({
      success: true,
      message: 'Track set successfully',
      currentTrack: room.currentTrack
    })
  } catch (error) {
    next(error)
  }
}

export const addToQueue = async (req, res, next) => {
  try {
    const { roomId } = req.params
    const track = req.validated
    const userId = req.userId

    const room = await Room.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      p => p.user.toString() === userId.toString()
    )

    if (!isParticipant) {
      throw new ForbiddenError('You must be a room participant to add to queue')
    }

    await room.addToQueue(track, userId)

    res.status(200).json({
      success: true,
      message: 'Track added to queue',
      queue: room.queue
    })
  } catch (error) {
    next(error)
  }
}

export const removeFromQueue = async (req, res, next) => {
  try {
    const { roomId, index } = req.params
    const userId = req.userId
    const trackIndex = parseInt(index)

    const room = await Room.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    // Check if user is admin or added the track
    const isAdmin = room.participants.some(
      p => p.user.toString() === userId.toString() && p.role === 'admin'
    )

    const isTrackOwner = room.queue[trackIndex]?.addedBy?.toString() === userId.toString()

    if (!isAdmin && !isTrackOwner) {
      throw new ForbiddenError('You can only remove tracks you added or need admin privileges')
    }

    await room.removeFromQueue(trackIndex)

    res.status(200).json({
      success: true,
      message: 'Track removed from queue',
      queue: room.queue
    })
  } catch (error) {
    next(error)
  }
}

export const clearQueue = async (req, res, next) => {
  try {
    const { roomId } = req.params
    const userId = req.userId

    const room = await Room.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    // Only admins can clear the queue
    const isAdmin = room.participants.some(
      p => p.user.toString() === userId.toString() && p.role === 'admin'
    )

    if (!isAdmin) {
      throw new ForbiddenError('Only room admins can clear the queue')
    }

    room.queue = []
    await room.save()

    res.status(200).json({
      success: true,
      message: 'Queue cleared',
      queue: room.queue
    })
  } catch (error) {
    next(error)
  }
}