import mongoose from 'mongoose';

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Server name is required'],
    trim: true,
    maxlength: [100, 'Server name cannot exceed 100 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  countryCode: {
    type: String,
    required: [true, 'Country code is required'],
    uppercase: true,
    length: [2, 'Country code must be 2 characters'],
    match: [/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters']
  },
  hostname: {
    type: String,
    required: [true, 'Hostname is required'],
    trim: true,
    match: [/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/, 'Invalid hostname format']
  },
  ip: {
    type: String,
    required: [true, 'IP address is required'],
    match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address format']
  },
  port: {
    type: Number,
    required: true,
    min: [1, 'Port must be between 1 and 65535'],
    max: [65535, 'Port must be between 1 and 65535'],
    default: 51820
  },
  coordinates: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  load: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    set: function(value) {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    }
  },
  ping: {
    type: Number,
    default: 0,
    min: 0
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  maxUsers: {
    type: Number,
    default: 1000,
    min: 1,
    max: 10000
  },
  currentUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  flags: {
    isPremium: { type: Boolean, default: false },
    supportsWireGuard: { type: Boolean, default: true },
    supportsOpenVPN: { type: Boolean, default: false },
    supportsIKEv2: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false }
  },
  technical: {
    publicKey: { type: String, required: true },
    endpoint: { type: String, required: true },
    allowedIPs: { type: [String], default: ['0.0.0.0/0'] },
    dns: { type: [String], default: ['1.1.1.1', '8.8.8.8'] },
    persistentKeepalive: { type: Number, default: 25, min: 0, max: 255 }
  },
  stats: {
    uptime: { type: Number, default: 0 },
    totalConnections: { type: Number, default: 0 },
    totalDataTransferred: {
      upload: { type: Number, default: 0 },
      download: { type: Number, default: 0 }
    },
    lastHealthCheck: { type: Date, default: Date.now },
    healthStatus: { 
      type: String, 
      enum: ['healthy', 'degraded', 'offline'], 
      default: 'healthy' 
    }
  },
  metadata: {
    city: String,
    region: String,
    isp: String,
    bandwidth: Number, // in Mbps
    version: String
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Remove technical details from public responses
      delete ret.technical;
      return ret;
    }
  }
});

// Compound indexes for optimal query performance
serverSchema.index({ countryCode: 1, active: 1 });
serverSchema.index({ active: 1, load: 1, ping: 1 });
serverSchema.index({ 'flags.isPremium': 1, active: 1 });
serverSchema.index({ 'stats.healthStatus': 1 });

// Virtual for server utilization percentage
serverSchema.virtual('utilization').get(function() {
  return (this.currentUsers / this.maxUsers) * 100;
});

// Methods
serverSchema.methods.isAvailable = function() {
  return this.active && 
         this.stats.healthStatus === 'healthy' && 
         this.currentUsers < this.maxUsers &&
         this.load < 90;
};

serverSchema.methods.canAcceptUser = function(userSubscription) {
  if (!this.isAvailable()) return false;
  
  if (this.flags.isPremium && userSubscription === 'free') {
    return false;
  }
  
  return true;
};

serverSchema.methods.updateLoad = async function(newLoad) {
  this.load = Math.max(0, Math.min(100, newLoad));
  this.stats.lastHealthCheck = new Date();
  
  // Update health status based on load
  if (this.load > 90) {
    this.stats.healthStatus = 'degraded';
  } else if (this.load > 95) {
    this.stats.healthStatus = 'offline';
  } else {
    this.stats.healthStatus = 'healthy';
  }
  
  await this.save();
};

// Static methods
serverSchema.statics.findAvailable = function() {
  return this.find({
    active: true,
    'stats.healthStatus': 'healthy',
    currentUsers: { $lt: { $multiply: ['$maxUsers', 0.95] } },
    load: { $lt: 90 }
  });
};

serverSchema.statics.getCountryStats = function() {
  return this.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: '$countryCode',
        country: { $first: '$country' },
        serverCount: { $sum: 1 },
        totalUsers: { $sum: '$currentUsers' },
        avgLoad: { $avg: '$load' },
        avgPing: { $avg: '$ping' }
      }
    },
    { $sort: { serverCount: -1 } }
  ]);
};

serverSchema.statics.findOptimal = function(userSubscription = 'free') {
  const matchStage = {
    active: true,
    'stats.healthStatus': 'healthy',
    currentUsers: { $lt: { $multiply: ['$maxUsers', 0.9] } },
    load: { $lt: 80 }
  };

  // Free users can't access premium servers
  if (userSubscription === 'free') {
    matchStage['flags.isPremium'] = false;
  }

  return this.find(matchStage)
    .sort({ load: 1, ping: 1, currentUsers: 1 })
    .limit(1);
};

// Добавьте этот статический метод в класс Server
serverSchema.statics.getCountryStats = function() {
  return this.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: '$countryCode',
        country: { $first: '$country' },
        serverCount: { $sum: 1 },
        totalUsers: { $sum: '$currentUsers' },
        avgLoad: { $avg: '$load' },
        avgPing: { $avg: '$ping' }
      }
    },
    { $sort: { serverCount: -1 } }
  ]);
};

export default mongoose.model('Server', serverSchema);