const mongoose = require('mongoose');

const creditBalanceSchema = new mongoose.Schema(
  {
    balanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      ref: 'User',
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: String,
      trim: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports =
  mongoose.models.CreditBalance ||
  mongoose.model('CreditBalance', creditBalanceSchema);
