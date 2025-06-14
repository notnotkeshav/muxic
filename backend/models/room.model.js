import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },

  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },

  // Room Creator & Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Room Settings
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    requiresPassword: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      select: false
    },
    maxParticipants: {
      type: Number,
      default: 10,
      min: 2,
      max: 50
    },
    allowGuestControl: {
      type: Boolean,
      default: false
    },
    autoPlay: {
      type: Boolean,
      default: true
    }
  },

  // Current State
  currentTrack: {
    title: String,
    artist: String,
    album: String,
    duration: Number,
    url: String,
    thumbnail: String,
    source: {
      type: String,
      enum: ['spotify', 'youtube', 'soundcloud', 'local', 'other'],
      default: 'other'
    }
  },

  // Playback State
  playback: {
    isPlaying: {
      type: Boolean,
      default: false
    },
    currentTime: {
      type: Number,
      default: 0
    },
    volume: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Queue Management
  queue: [{
    title: String,
    artist: String,
    album: String,
    duration: Number,
    url: String,
    thumbnail: String,
    source: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Participants
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'participant'],
      default: 'participant'
    },
    isOnline: {
      type: Boolean,
      default: true
    },
    devices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device'
    }]
  }],

  // Room Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

roomSchema.index({ roomId: 1 }, { unique: true })
roomSchema.index({ createdBy: 1 })
roomSchema.index({ 'participants.user': 1 })
roomSchema.index({ isActive: 1, 'settings.isPublic': 1 })

// Instance methods
roomSchema.methods.addParticipant = function (userId, role = 'particpant', deviceIds = []) {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString())

  if (!existingParticipant) {
    this.participants.push({
      role,
      user: userId,
      devices: deviceIds,
      joinedAt: new Date()
    })
  } else {
    existingParticipant.isOnline = true
    existingParticipant.devices = [...new Set([...existingParticipant.devices, ...deviceIds])]
  }

  this.lastActivity = Date.now()
  return this.save()
}

roomSchema.methods.removeParticipant = function (userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString())
  this.lastActivity = Date.now()
  return this.save()
}

roomSchema.methods.updatePlayback = function (playbackState) {
  this.playback = { ...this.playback, ...playbackState, lastUpdated: Date.now() }
  this.lastActivity = Date.now()
  return this.save()
}

roomSchema.methods.addToQueue = function (track, userId) {
  this.queue.push({
    ...track,
    addedBy: userId,
    addedAt: new Date()
  })
  this.lastActivity = Date.now()
  return this.save()
}

roomSchema.methods.removeFromQueue = function (index) {
  if (index >= 0 && index < this.queue.length) {
    this.queue.splice(index, 1)
    this.lastActivity = Date.now()
    return this.save()
  }
  return Promise.resolve(this)
}

roomSchema.methods.nextTrack = function () {
  if (this.queue.length > 0) {
    this.currentTrack = this.queue.shift()
    this.playback.currentTime = 0
    this.playback.lastUpdated = Date.now()
    this.lastActivity = Date.now()
    return this.save()
  }
  return Promise.resolve(this)
}

// Static methods
roomSchema.statics.generateRoomId = function () {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

roomSchema.statics.findPublicRooms = function (limit = 20) {
  return this.find({
    'settings.isPublic': true,
    isActive: true
  })
    .populate('createdBy', 'username avatar')
    .sort({ lastActivity: -1 })
    .limit(limit)
}

roomSchema.statics.findUserRooms = function (userId) {
  return this.find({
    $or: [
      { createdBy: userId },
      { 'participants.user': userId }
    ],
    isActive: true
  })
    .populate('createdBy', 'username avatar')
    .sort({ lastActivity: -1 })
}

export default mongoose.model('Room', roomSchema)