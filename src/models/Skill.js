const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    skillId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    categoryId: {
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
    proficiencyLevel: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      uppercase: true,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: 0,
    },
    selfDeclared: {
      type: Boolean,
      default: false,
    },
    validationStatus: {
      type: String,
      enum: ['UNVALIDATED', 'PENDING', 'VALIDATED'],
      uppercase: true,
      default: 'UNVALIDATED',
    },
    validationScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Per-skill trust mechanics (P/E formula).
    skillTier: {
      type: String,
      enum: ['STARTER', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      uppercase: true,
      default: 'STARTER',
    },
    mentorValidated: {
      type: Boolean,
      default: false,
    },
    linkedPlatforms: {
      type: [String],
      default: [],
    },
    portfolioScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    endorsementScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    endorsementsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    trustBadge: {
      type: String,
      default: 'Unverified',
      trim: true,
    },
    trustModifier: {
      type: Number,
      default: 1.0,
      min: 1.0,
    },
    validatedBy: {
      type: String,
      trim: true,
      ref: 'User',
    },
    validatedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.Skill || mongoose.model('Skill', skillSchema);