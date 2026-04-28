const mongoose = require('mongoose');

const mentorSkillSchema = new mongoose.Schema(
  {
    mentorSkillId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    mentorId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Mentor',
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
    verificationDate: {
      type: Date,
    },
    verifiedBy: {
      type: String,
      trim: true,
      ref: 'Admin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports =
  mongoose.models.MentorSkill ||
  mongoose.model('MentorSkill', mentorSkillSchema);
