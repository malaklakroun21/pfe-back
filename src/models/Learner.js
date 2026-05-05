const mongoose = require('mongoose');

const learnerSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      ref: 'User',
    },
    learningGoals: {
      type: String,
      default: '',
    },
    preferredLearningStyle: {
      type: String,
      trim: true,
      default: '',
    },
    totalSessionsAttended: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSessionsTaught: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRatingAsTeacher: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    averageRatingAsLearner: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.Learner || mongoose.model('Learner', learnerSchema);