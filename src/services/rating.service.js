const Rating = require('../models/Rating');
const Session = require('../models/Session');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const ensureAuthenticatedUser = (user) => {
  if (!user?.userId) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  return user;
};

const createRating = async (currentUser, payload) => {
  const user = ensureAuthenticatedUser(currentUser);
  const sessionId = payload.sessionId.trim();
  const toUser = payload.toUserId.trim();
  const comment = payload.comment || '';

  // Validate both the session and the rating target upfront.
  const [session, ratedUser] = await Promise.all([
    Session.findOne({ sessionId }),
    User.findOne({ userId: toUser, accountStatus: 'ACTIVE' }),
  ]);

  if (!session) {
    throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
  }

  if (!ratedUser) {
    throw new ApiError(404, 'User to rate not found', 'USER_NOT_FOUND');
  }

  if (session.status !== 'COMPLETED') {
    throw new ApiError(409, 'You can only rate completed sessions', 'SESSION_NOT_COMPLETED');
  }

  // Rating is allowed only for users that took part in the session.
  const isSessionParticipant = [session.teacherId, session.learnerId].includes(user.userId);
  if (!isSessionParticipant) {
    throw new ApiError(403, 'Only session participants can submit ratings', 'FORBIDDEN');
  }

  if (![session.teacherId, session.learnerId].includes(toUser) || toUser === user.userId) {
    throw new ApiError(400, 'Invalid rating target for this session', 'VALIDATION_ERROR');
  }

  // One rating per (fromUser, session).
  const existingRating = await Rating.findOne({
    sessionId,
    fromUser: user.userId,
  });

  if (existingRating) {
    throw new ApiError(409, 'You already rated this session', 'RATING_ALREADY_EXISTS');
  }

  const rating = await Rating.create({
    fromUser: user.userId,
    toUser,
    sessionId,
    score: payload.score,
    comment,
  });

  return rating.toObject();
};

const getRatingsForUser = async (userId) => {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new ApiError(400, 'User id is required', 'VALIDATION_ERROR');
  }

  const reviews = await Rating.find({ toUser: normalizedUserId }).sort({ createdAt: -1 }).lean();
  const total = reviews.length;
  // Return a rounded average suitable for profile display.
  const averageRating = total
    ? Number((reviews.reduce((sum, review) => sum + review.score, 0) / total).toFixed(2))
    : 0;

  return {
    userId: normalizedUserId,
    averageRating,
    totalReviews: total,
    reviews,
  };
};

module.exports = {
  createRating,
  getRatingsForUser,
};
