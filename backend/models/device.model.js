import mongoose from 'mongoose'

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  deviceId: {
    type: String,
    required: true
  },

  deviceName: {
    type: String,
    required: true,
    trim: true
  },

  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'smart_speaker', 'web', 'other', 'bot'],
    default: 'other'
  },

  platform: {
    type: String, // iOS, Android, Windows, macOS, Linux, etc.
    default: 'unknown'
  },

  browser: {
    type: String, // Chrome, Firefox, Safari, etc.
    default: null
  },

  isOnline: {
    type: Boolean,
    default: false
  },

  socketId: {
    type: String,
    default: null
  },

  lastActive: {
    type: Date,
    default: Date.now
  },

  capabilities: {
    canPlay: {
      type: Boolean,
      default: true
    },
    canControl: {
      type: Boolean,
      default: true
    },
    supportedFormats: [{
      type: String,
      enum: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'webm']
    }],
    maxVolume: {
      type: Number,
      default: 100
    }
  },

  settings: {
    autoSync: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    },
    defaultVolume: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  }
}, {
  timestamps: true
})

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true })
deviceSchema.index({ userId: 1, isOnline: 1 })
deviceSchema.index({ socketId: 1 })

// Instance methods
deviceSchema.methods.updateStatus = function (isOnline, socketId = null) {
  this.isOnline = isOnline
  this.lastActive = Date.now()
  if (socketId) this.socketId = socketId
  return this.save()
}

deviceSchema.methods.updateSettings = function (newSettings) {
  this.settings = { ...this.settings, ...newSettings }
  return this.save()
}

// Static methods
deviceSchema.statics.findUserDevices = function (userId, onlineOnly = false) {
  const query = { userId }
  if (onlineOnly) query.isOnline = true
  return this.find(query).sort({ lastActive: -1 })
}

deviceSchema.statics.findBySocketId = function (socketId) {
  return this.findOne({ socketId })
}

export default mongoose.model('Device', deviceSchema)