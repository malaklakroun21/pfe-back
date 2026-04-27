const mongoose = require('mongoose');

const mentorApplicationSchema = new mongoose.Schema(
  {
    applicationId: {
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
    skillCategoryId: {
      type: String,
      required: true,
      trim: true,
      ref: 'SkillCategory',
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    applicationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'REAPPLICATION'],
      uppercase: true,
      default: 'PENDING',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: String,
      trim: true,
      ref: 'Admin',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    reapplicationAllowedAt: {
      type: Date,
    },
    professionalStatement: {
      type: String,
      default: '',
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'yearsOfExperience must be an integer',
      },
    },
    previousApplications: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'previousApplications must be an integer',
      },
    },
  },
  {
    versionKey: false,
  }
);

module.exports =
  mongoose.models.MentorApplication ||
  mongoose.model('MentorApplication', mentorApplicationSchema);
