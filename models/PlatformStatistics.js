const mongoose = require('mongoose');

const platformStatisticsSchema = new mongoose.Schema(
  {
    statId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    totalUsers: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLearners: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalMentors: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalVerifiedMentors: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCreditsInCirculation: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalCreditsInCirculation must be an integer',
      },
    },
    validationRequestsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageSessionRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    mentorApplicationsReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    mentorApplicationsApproved: {
      type: Number,
      default: 0,
      min: 0,
    },
    mentorApplicationsRejected: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
    },
  },
  {
    versionKey: false,
  }
);

module.exports =
  mongoose.models.PlatformStatistics ||
  mongoose.model('PlatformStatistics', platformStatisticsSchema);
