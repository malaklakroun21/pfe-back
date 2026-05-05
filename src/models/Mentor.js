const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      ref: 'User',
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'REJECTED', 'SUSPENDED'],
      uppercase: true,
      default: 'VERIFIED',
    },
    totalValidationsPerformed: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageValidationRating: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0'),
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: String,
      trim: true,
      ref: 'User',
    },
    suspendedAt: {
      type: Date,
    },
    suspensionReason: {
      type: String,
      trim: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.Mentor || mongoose.model('Mentor', mentorSchema);