import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  preferences: {
    theme: { type: String, default: 'dark', enum: ['dark', 'light', 'oled', 'gradient'] },
    accentColor: { type: String, default: '#10b981' },
    autoConnect: { type: Boolean, default: false },
    killSwitch: { type: Boolean, default: true },
    notifications: {
      connection: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
      updates: { type: Boolean, default: false }
    }
  },
  subscription: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free',
    required: true
  },
  dataUsage: {
    upload: { type: Number, default: 0 },
    download: { type: Number, default: 0 },
    resetDate: { type: Date, default: Date.now }
  },
  limits: {
    maxConnections: { type: Number, default: 3 },
    dataLimit: { type: Number, default: 10737418240 } // 10GB in bytes
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  emailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'subscription': 1, 'isActive': 1 });

// Middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  if (this.isModified('preferences.accentColor') && !this.preferences.accentColor.startsWith('#')) {
    this.preferences.accentColor = `#${this.preferences.accentColor}`;
  }
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasReachedDataLimit = function() {
  const totalData = this.dataUsage.upload + this.dataUsage.download;
  return totalData >= this.limits.dataLimit;
};

userSchema.methods.getRemainingData = function() {
  const totalData = this.dataUsage.upload + this.dataUsage.download;
  return Math.max(0, this.limits.dataLimit - totalData);
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$subscription',
        count: { $sum: 1 },
        totalData: { 
          $sum: { $add: ['$dataUsage.upload', '$dataUsage.download'] } 
        }
      }
    }
  ]);
};

export default mongoose.model('User', userSchema);