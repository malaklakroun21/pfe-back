const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
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
    relatedSessionId: {
      type: String,
      trim: true,
      ref: 'Session',
    },
    transactionType: {
      type: String,
      enum: ['EARN', 'SPEND', 'ADJUSTMENT', 'INITIAL_ALLOCATION'],
      uppercase: true,
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },
    balanceBefore: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      default: 0,
      min: 0,
    },
    initiatedBy: {
      type: String,
      trim: true,
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

module.exports =
  mongoose.models.CreditTransaction ||
  mongoose.model('CreditTransaction', creditTransactionSchema);
