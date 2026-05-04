const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema(
  {
    // Sender (learner) and receiver (teacher) of session credits.
    fromUser: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: 'User',
    },
    toUser: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: 'User',
    },
    // Credits moved in this transfer event.
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    // Session this transfer belongs to.
    sessionId: {
      type: String,
      required: true,
      trim: true,
      ref: 'Session',
    },
    type: {
      type: String,
      enum: ['TRANSFER'],
      uppercase: true,
      required: true,
      default: 'TRANSFER',
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

// Prevent duplicate transfers for the same session completion.
creditTransactionSchema.index({ sessionId: 1, type: 1 }, { unique: true });

module.exports =
  mongoose.models.CreditTransaction ||
  mongoose.model('CreditTransaction', creditTransactionSchema);
