const mongoose = require('mongoose');

const endorsementSchema = new mongoose.Schema(
  {
    endorsementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    fromUserId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
      index: true,
    },
    toUserId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
      index: true,
    },
    skillId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Skill',
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    sessionId: {
      type: String,
      trim: true,
      ref: 'Session',
      default: null,
    },
    projectId: {
      type: String,
      trim: true,
      ref: 'Project',
      default: null,
    },
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

endorsementSchema.index(
  { fromUserId: 1, toUserId: 1, skillId: 1, sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: 'string' } } }
);

module.exports =
  mongoose.models.Endorsement || mongoose.model('Endorsement', endorsementSchema);
