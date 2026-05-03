const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    // Reviewer, reviewed user, and session scope.
    fromUser: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
      index: true,
    },
    toUser: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Session',
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
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

// One rating per user per session.
ratingSchema.index({ fromUser: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.models.Rating || mongoose.model('Rating', ratingSchema);
