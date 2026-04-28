const mongoose = require('mongoose');

const sessionRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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
    requestStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
      uppercase: true,
      default: 'PENDING',
    },
    preferredDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    scheduledDate: {
      type: Date,
    },
    proposedByTeacher: {
      type: Date,
    },
    responseDate: {
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

module.exports =
  mongoose.models.SessionRequest ||
  mongoose.model('SessionRequest', sessionRequestSchema);
