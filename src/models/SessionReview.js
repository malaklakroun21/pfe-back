const mongoose = require('mongoose');

const sessionReviewSchema = new mongoose.Schema(
  {
    reviewId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Session',
    },
    reviewerId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    reviewedId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
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
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
  }
);

module.exports =
  mongoose.models.SessionReview ||
  mongoose.model('SessionReview', sessionReviewSchema);
