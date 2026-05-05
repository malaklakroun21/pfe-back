const mongoose = require('mongoose');

const skillCategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    categoryName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    parentCategoryId: {
      type: String,
      trim: true,
      ref: 'SkillCategory',
    },
    description: {
      type: String,
      default: '',
    },
    iconUrl: {
      type: String,
      trim: true,
      default: '',
    },
    assignedAdminUserId: {
      type: String,
      trim: true,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
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
  mongoose.models.SkillCategory ||
  mongoose.model('SkillCategory', skillCategorySchema);