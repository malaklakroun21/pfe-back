const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    requestId: {
      type: String,
      required: true,
      trim: true,
      ref: 'SessionRequest',
    },
    learnerId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Learner',
    },
    teacherId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Learner',
    },
    skillId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Skill',
    },
    sessionStatus: {
      type: String,
      enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'],
      uppercase: true,
      default: 'PENDING',
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    actualDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditsExchanged: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
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

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);
