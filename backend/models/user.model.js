import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },

  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [5, 'Username must be at least 5 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },

  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [25, 'Full name cannot exceed 25 characters']
  },

  avatar: {
    type: String,
    default: null
  },

  bio: {
    type: String,
    maxlength: [200, 'Bio cannot exceed 200 characters'],
    default: ''
  },

  googleId: {
    type: String
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  otp: {
    code: {
      type: Number,
      select: false
    },
    expiresAt: {
      type: Date,
      select: false
    }
  },

  resetPasswordToken: {
    type: String,
    select: false
  },

  resetPasswordExpires: {
    type: Date,
    select: false
  },

  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    },
    showOnlineStatus: {
      type: Boolean,
      default: true
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isBanned: {
    type: Boolean,
    default: false
  },

  banReason: {
    type: String,
    default: null
  },

  lastLogin: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.otp;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  },
  toObject: { virtuals: true }
})

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ username: 1 }, { unique: true })
userSchema.index({ googleId: 1 }, { unique: true, sparse: true })
userSchema.index({ isActive: 1, isBanned: 1 })

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

userSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

userSchema.methods.toAuthJSON = function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    fullName: this.fullName,
    avatar: this.avatar,
    bio: this.bio,
    verified: this.isVerified,
    privacy: this.privacy,
    lastLogin: this.lastLogin
  }
}

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false
  return await bcrypt.compare(candidatePassword, this.password)
}

userSchema.statics.findByCredentials = async function (identifier) {
  const user = await this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  }).select('+password')

  return user
}

userSchema.statics.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default mongoose.model('User', userSchema)