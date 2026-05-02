const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    requiredSkill: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      uppercase: true,
      default: 'OPEN',
    },
  },
  {
    versionKey: false,
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  }
);

projectSchema.index({ ownerId: 1, createdAt: -1 });
projectSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
