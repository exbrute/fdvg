import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: [true, 'Server ID is required']
  },
  config: {
    publicKey: {
      type: String,
      required: true,
      match: [/^[A-Za-z0-9+/]{43}=$/, 'Invalid public key format']
    },
    privateKey: {
      type: String,
      required: true,
      select: false, // Never return private key in queries
      match: [/^[A-Za-z0-9+/]{43}=$/, 'Invalid private key format']
    },
    address: {
      type: String,
      required: true,
      match: [/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'Invalid IP address format']
    },
    dns: [{
      type: String,
      match: [/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid DNS IP format']
    }],
    endpoint: {
      type: String,
      required: true
    },
    allowedIPs: [{
      type: String,
      match: [/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'Invalid IP range format']
    }],
    persistentKeepalive: {
      type: Number,
      min: 0,
      max: 255,
      default: 25
    }
  },
  status: {
    type: String,
    enum: {
      values: ['connecting', 'connected', 'disconnecting', 'disconnected', 'error', 'timeout'],
      message: '{VALUE} is not a valid connection status'
    },
    default: 'connecting',
    index: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: {
    type: Number, // in seconds
    min: 0
  },
  dataTransferred: {
    upload: {
      type: Number,
      default: 0,
      min: 0
    },
    download: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  speed: {
    upload: {
      type: Number,
      default: 0,
      min: 0
    },
    download: {
      type: Number,
      default: 0,
      min: 0
    },
    ping: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUpdate: Date
  },
  clientInfo: {
    ip: {
      type: String,
      match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP format']
    },
    userAgent: String,
    platform: String,
    version: String,
    country: String,
    city: String
  },
  error: {
    code: String,
    message: String,
    timestamp: Date
  },
  metadata: {
    isAutoReconnect: { type: Boolean, default: false },
    killSwitchEnabled: { type: Boolean, default: true },
    protocol: { type: String, default: 'wireguard', enum: ['wireguard', 'openvpn'] }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.config.privateKey;
      return ret;
    }
  }
});

// Compound indexes
connectionSchema.index({ userId: 1, status: 1 });
connectionSchema.index({ serverId: 1, status: 1 });
connectionSchema.index({ startTime: -1 });
connectionSchema.index({ userId: 1, startTime: -1 });
connectionSchema.index({ 'clientInfo.ip': 1 });

// Virtual for real-time duration
connectionSchema.virtual('currentDuration').get(function() {
  if (this.status === 'connected') {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
  return this.duration || 0;
});

// Virtual for connection quality
connectionSchema.virtual('quality').get(function() {
  if (this.status !== 'connected') return null;
  
  const pingScore = this.speed.ping < 50 ? 1 : this.speed.ping < 100 ? 0.8 : 0.5;
  const speedScore = this.speed.download > 50 ? 1 : this.speed.download > 20 ? 0.8 : 0.5;
  
  return Math.round((pingScore * 0.6 + speedScore * 0.4) * 100);
});

// Pre-save middleware to calculate total data
connectionSchema.pre('save', function(next) {
  if (this.isModified('dataTransferred.upload') || this.isModified('dataTransferred.download')) {
    this.dataTransferred.total = this.dataTransferred.upload + this.dataTransferred.download;
  }
  
  if (this.status === 'disconnected' && this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

// Methods
connectionSchema.methods.isActive = function() {
  return this.status === 'connected' || this.status === 'connecting';
};

connectionSchema.methods.disconnect = async function() {
  if (this.status === 'connected' || this.status === 'connecting') {
    this.status = 'disconnecting';
    this.endTime = new Date();
    await this.save();
  }
};

connectionSchema.methods.updateSpeed = async function(uploadSpeed, downloadSpeed, ping) {
  this.speed.upload = uploadSpeed;
  this.speed.download = downloadSpeed;
  this.speed.ping = ping;
  this.speed.lastUpdate = new Date();
  await this.save();
};

connectionSchema.methods.addDataTransfer = async function(upload, download) {
  this.dataTransferred.upload += upload;
  this.dataTransferred.download += download;
  await this.save();
};

connectionSchema.methods.markError = async function(errorCode, errorMessage) {
  this.status = 'error';
  this.error = {
    code: errorCode,
    message: errorMessage,
    timestamp: new Date()
  };
  this.endTime = new Date();
  await this.save();
};

// Static methods
connectionSchema.statics.findActiveByUser = function(userId) {
  return this.findOne({
    userId,
    status: { $in: ['connected', 'connecting'] }
  }).populate('serverId', 'name country hostname load ping');
};

connectionSchema.statics.getUserConnectionHistory = function(userId, limit = 10) {
  return this.find({ userId })
    .populate('serverId', 'name country countryCode hostname')
    .sort({ startTime: -1 })
    .limit(limit);
};

connectionSchema.statics.getServerConnectionsCount = function(serverId) {
  return this.countDocuments({
    serverId,
    status: { $in: ['connected', 'connecting'] }
  });
};

connectionSchema.statics.getDataUsageByPeriod = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        startTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalUpload: { $sum: '$dataTransferred.upload' },
        totalDownload: { $sum: '$dataTransferred.download' },
        totalConnections: { $sum: 1 }
      }
    }
  ]);
};

// Instance method to get connection config for client
connectionSchema.methods.getClientConfig = function() {
  const { privateKey, ...safeConfig } = this.config;
  return {
    ...safeConfig,
    connectionId: this._id,
    server: {
      name: this.serverId?.name,
      country: this.serverId?.country,
      hostname: this.serverId?.hostname
    }
  };
};

// Исправленная строка экспорта - убрана опечатка в имени схемы
export default mongoose.model('Connection', connectionSchema);