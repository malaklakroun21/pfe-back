const mongoose = require('mongoose');

const skillEvidenceSchema = new mongoose.Schema(
  {
    evidenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    skillId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Skill',
    },
    evidenceType: {
      type: String,
      enum: [
        'PORTFOLIO_LINK',
        'GITHUB_REPO',
        'PROJECT',
        'CERTIFICATE',
        'CV',
        'LINKEDIN',
        'OTHER',
      ],
      uppercase: true,
      required: true,
    },
    evidenceUrl: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
  }
);

module.exports =
  mongoose.models.SkillEvidence ||
  mongoose.model('SkillEvidence', skillEvidenceSchema);
