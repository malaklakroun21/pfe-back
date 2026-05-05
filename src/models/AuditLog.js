const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    adminUserId: {
      type: String,
      trim: true,
      ref: 'User',
    },
    userId: {
      type: String,
      trim: true,
      ref: 'User',
    },
    actionType: {
      type: String,
      required: true,
      trim: true,
    },
    targetEntityId: {
      type: String,
      trim: true,
    },
    targetEntityType: {
      type: String,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    reason: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);