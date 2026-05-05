const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      ref: 'User',
    },
    assignedSkillCategoryId: {
      type: String,
      trim: true,
      ref: 'SkillCategory',
    },
    skillName: {
      type: String,
      trim: true,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
    assignedDate: {
      type: Date,
    },
    lastActiveDate: {
      type: Date,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);