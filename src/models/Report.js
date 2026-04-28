const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    reporterId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    reportedUserId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    violationType: {
      type: String,
      enum: [
        'FRAUD',
        'HARASSMENT',
        'POOR_MENTORING',
        'INAPPROPRIATE_CONDUCT',
        'SPAM',
        'OTHER',
      ],
      uppercase: true,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    evidence: {
      type: [String],
      default: [],
    },
    reportStatus: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
      uppercase: true,
      default: 'PENDING',
    },
    assignedTo: {
      type: String,
      trim: true,
      ref: 'Admin',
    },
    resolution: {
      type: String,
      default: '',
    },
    resolutionDate: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.Report || mongoose.model('Report', reportSchema);
