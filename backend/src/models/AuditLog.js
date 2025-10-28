import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'user_login',
      'user_logout',
      'connection_start',
      'connection_end',
      'server_status_change',
      'config_update',
      'security_event',
      'admin_action'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some actions might not have a user
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  resourceType: {
    type: String,
    enum: ['user', 'server', 'connection', 'system']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

// Static methods for common queries
auditLogSchema.statics.log = function(data) {
  return this.create(data);
};

auditLogSchema.statics.getUserActivity = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.getSecurityEvents = function(startDate, endDate) {
  return this.find({
    action: { $in: ['user_login', 'security_event'] },
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: -1 });
};

export default mongoose.model('AuditLog', auditLogSchema);