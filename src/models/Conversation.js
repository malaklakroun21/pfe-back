const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    participant1Id: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    participant2Id: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageAt: {
      type: Date,
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

conversationSchema.index({ participant1Id: 1, participant2Id: 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1, createdAt: -1 });

module.exports =
  mongoose.models.Conversation ||
  mongoose.model('Conversation', conversationSchema);
