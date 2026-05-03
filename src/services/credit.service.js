const mongoose = require('mongoose');

const CreditTransaction = require('../models/CreditTransaction');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const normalizeUserId = (userId, fieldName) => {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new ApiError(400, `${fieldName} is required`, 'VALIDATION_ERROR');
  }

  return normalizedUserId;
};

const parseCreditAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Credit amount must be greater than 0', 'VALIDATION_ERROR');
  }

  return amount;
};

// User.timeCredits is Decimal128 in this codebase; normalize to Number.
const readCreditValue = (user) => {
  if (!user) {
    return 0;
  }

  const raw = user.timeCredits;
  return Number(raw?.toString?.() ?? raw ?? 0);
};

// Core transfer primitive used by session completion flow.
const transferCredits = async ({
  fromUserId,
  toUserId,
  amount,
  sessionId,
  mongoSession = null,
}) => {
  const normalizedFromUserId = normalizeUserId(fromUserId, 'fromUserId');
  const normalizedToUserId = normalizeUserId(toUserId, 'toUserId');
  const normalizedSessionId = sessionId?.trim();
  const parsedAmount = parseCreditAmount(amount);

  if (!normalizedSessionId) {
    throw new ApiError(400, 'sessionId is required', 'VALIDATION_ERROR');
  }

  if (normalizedFromUserId === normalizedToUserId) {
    throw new ApiError(400, 'Cannot transfer credits to the same user', 'VALIDATION_ERROR');
  }

  const queryOptions = mongoSession ? { session: mongoSession } : {};
  const [fromUser, toUser] = await Promise.all([
    User.findOne({ userId: normalizedFromUserId }, null, queryOptions),
    User.findOne({ userId: normalizedToUserId }, null, queryOptions),
  ]);

  if (!fromUser || !toUser) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const learnerCredits = readCreditValue(fromUser);
  if (learnerCredits < parsedAmount) {
    throw new ApiError(400, 'Insufficient credits to complete this session', 'INSUFFICIENT_CREDITS');
  }

  // Conditional debit prevents race conditions from overspending.
  const debitResult = await User.updateOne(
    {
      userId: normalizedFromUserId,
      timeCredits: { $gte: parsedAmount },
    },
    {
      $inc: { timeCredits: -parsedAmount },
    },
    queryOptions
  );

  if (!debitResult.modifiedCount) {
    throw new ApiError(409, 'Credit balance changed, please retry', 'CREDIT_CONFLICT');
  }

  // Credit teacher after learner debit succeeds.
  await User.updateOne(
    {
      userId: normalizedToUserId,
    },
    {
      $inc: { timeCredits: parsedAmount },
    },
    queryOptions
  );

  // Audit trail record for history endpoint and financial traceability.
  const transaction = await CreditTransaction.create(
    [
      {
        fromUser: normalizedFromUserId,
        toUser: normalizedToUserId,
        amount: parsedAmount,
        sessionId: normalizedSessionId,
        type: 'TRANSFER',
      },
    ],
    queryOptions
  );

  return transaction[0].toObject();
};

const listCreditHistoryForUser = async (userId) => {
  const normalizedUserId = normalizeUserId(userId, 'userId');

  return CreditTransaction.find({
    $or: [{ fromUser: normalizedUserId }, { toUser: normalizedUserId }],
  })
    .sort({ createdAt: -1 })
    .lean();
};

// Convenience wrapper when caller wants this service to own transaction lifecycle.
const transferCreditsWithTransaction = async (payload) => {
  const mongoSession = await mongoose.startSession();

  try {
    let transferResult;

    await mongoSession.withTransaction(async () => {
      transferResult = await transferCredits({ ...payload, mongoSession });
    });

    return transferResult;
  } finally {
    await mongoSession.endSession();
  }
};

module.exports = {
  transferCredits,
  transferCreditsWithTransaction,
  listCreditHistoryForUser,
};
