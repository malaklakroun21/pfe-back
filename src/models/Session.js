const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    // Public identifier used by API paths.
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    // Learner and teacher are linked by userId (string), not ObjectId.
    learnerId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
      index: true,
    },
    teacherId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
      index: true,
    },
    // Domain fields requested for session request lifecycle.
    skill: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    date: {
      type: Date,
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    actualDuration: {
      type: Number,
      min: 0.01,
    },
    chargedCredits: {
      type: Number,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'],
      uppercase: true,
      default: 'PENDING',
      index: true,
    },
    // Marks whether credit transfer already ran for idempotency protection.
    creditsTransferred: {
      type: Boolean,
      default: false,
    },
    // Marks whether teacher XP was granted for this session (1 credit = 10 XP).
    xpAwarded: {
      type: Boolean,
      default: false,
    },
    // Dual confirmation — credits settle only when both are true.
    teacherConfirmed: {
      type: Boolean,
      default: false,
    },
    learnerConfirmed: {
      type: Boolean,
      default: false,
    },
    teacherConfirmedAt: {
      type: Date,
    },
    learnerConfirmedAt: {
      type: Date,
    },
    endorsementsUnlocked: {
      type: Boolean,
      default: false,
    },
    creditBreakdown: {
      hours: { type: Number },
      skillTier: { type: String },
      tierMultiplier: { type: Number },
      trustModifier: { type: Number },
      calculatedCredits: { type: Number },
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
