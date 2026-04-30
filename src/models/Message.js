const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    conversationId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Conversation',
    },
    senderId: {
      type: String,
      required: true,
      trim: true,
      ref: 'User',
    },
    content: {
      type: String,
      required: true,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
