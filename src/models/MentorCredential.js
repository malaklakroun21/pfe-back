const mongoose = require('mongoose');

const mentorCredentialSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    applicationId: {
      type: String,
      required: true,
      trim: true,
      ref: 'MentorApplication',
    },
    credentialType: {
      type: String,
      enum: ['CV', 'PORTFOLIO', 'LINKEDIN', 'CERTIFICATE', 'PROJECT', 'OTHER'],
      uppercase: true,
      required: true,
    },
    credentialUrl: {
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
    verifiedBy: {
      type: String,
      trim: true,
      ref: 'Admin',
    },
  },
  {
    versionKey: false,
  }
);

module.exports =
  mongoose.models.MentorCredential ||
  mongoose.model('MentorCredential', mentorCredentialSchema);
