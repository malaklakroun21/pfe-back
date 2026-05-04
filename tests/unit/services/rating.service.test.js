const Rating = require('../../../src/models/Rating');
const Session = require('../../../src/models/Session');
const User = require('../../../src/models/User');
const ratingService = require('../../../src/services/rating.service');

jest.mock('../../../src/models/Rating', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../../../src/models/Session', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../../src/models/User', () => ({
  findOne: jest.fn(),
}));

const completedSession = {
  sessionId: 'SES-1',
  teacherId: 'USR-TEACHER',
  learnerId: 'USR-LEARNER',
  status: 'COMPLETED',
};

const createRatingPayload = (overrides = {}) => ({
  sessionId: 'SES-1',
  toUserId: 'USR-TEACHER',
  score: 5,
  comment: 'Great',
  ...overrides,
});

const mockRatingFindChain = (leanResult) => {
  const lean = jest.fn().mockResolvedValue(leanResult);
  const sort = jest.fn().mockReturnValue({ lean });
  Rating.find.mockReturnValue({ sort });
  return { sort, lean };
};

describe('rating.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRating', () => {
    it('throws 401 when current user is missing', async () => {
      await expect(ratingService.createRating(null, createRatingPayload())).rejects.toMatchObject({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    });

    it('throws 404 when session does not exist', async () => {
      Session.findOne.mockResolvedValue(null);
      User.findOne.mockResolvedValue({ userId: 'USR-TEACHER', accountStatus: 'ACTIVE' });

      await expect(
        ratingService.createRating({ userId: 'USR-LEARNER' }, createRatingPayload())
      ).rejects.toMatchObject({ statusCode: 404, code: 'SESSION_NOT_FOUND' });

      expect(Session.findOne).toHaveBeenCalledWith({ sessionId: 'SES-1' });
    });

    it('throws 404 when rated user does not exist or is not active', async () => {
      Session.findOne.mockResolvedValue(completedSession);
      User.findOne.mockResolvedValue(null);

      await expect(
        ratingService.createRating({ userId: 'USR-LEARNER' }, createRatingPayload())
      ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
    });

    it('throws 409 when session is not completed', async () => {
      Session.findOne.mockResolvedValue({ ...completedSession, status: 'ACCEPTED' });
      User.findOne.mockResolvedValue({ userId: 'USR-TEACHER', accountStatus: 'ACTIVE' });

      await expect(
        ratingService.createRating({ userId: 'USR-LEARNER' }, createRatingPayload())
      ).rejects.toMatchObject({ statusCode: 409, code: 'SESSION_NOT_COMPLETED' });
    });

    it('throws 403 when caller is not a session participant', async () => {
      Session.findOne.mockResolvedValue(completedSession);
      User.findOne.mockResolvedValue({ userId: 'USR-TEACHER', accountStatus: 'ACTIVE' });

      await expect(
        ratingService.createRating({ userId: 'USR-STRANGER' }, createRatingPayload())
      ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('throws 400 when rating self', async () => {
      Session.findOne.mockResolvedValue(completedSession);
      User.findOne.mockResolvedValue({ userId: 'USR-LEARNER', accountStatus: 'ACTIVE' });

      await expect(
        ratingService.createRating(
          { userId: 'USR-LEARNER' },
          createRatingPayload({ toUserId: 'USR-LEARNER' })
        )
      ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    });

    it('throws 400 when toUserId is not the other participant', async () => {
      Session.findOne.mockResolvedValue(completedSession);
      User.findOne.mockResolvedValue({ userId: 'USR-OTHER', accountStatus: 'ACTIVE' });

      await expect(
        ratingService.createRating(
          { userId: 'USR-LEARNER' },
          createRatingPayload({ toUserId: 'USR-OTHER' })
        )
      ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    });

    it('throws 409 when user already rated this session', async () => {
      Session.findOne.mockResolvedValue(completedSession);
      User.findOne.mockResolvedValue({ userId: 'USR-TEACHER', accountStatus: 'ACTIVE' });
      Rating.findOne.mockResolvedValue({ fromUser: 'USR-LEARNER', sessionId: 'SES-1' });

      await expect(
        ratingService.createRating({ userId: 'USR-LEARNER' }, createRatingPayload())
      ).rejects.toMatchObject({ statusCode: 409, code: 'RATING_ALREADY_EXISTS' });
    });

    it('creates a rating and returns plain object', async () => {
      Session.findOne.mockResolvedValue(completedSession);
      User.findOne.mockResolvedValue({ userId: 'USR-TEACHER', accountStatus: 'ACTIVE' });
      Rating.findOne.mockResolvedValue(null);

      const createdDoc = {
        fromUser: 'USR-LEARNER',
        toUser: 'USR-TEACHER',
        sessionId: 'SES-1',
        score: 5,
        comment: 'Great',
      };
      Rating.create.mockResolvedValue({
        ...createdDoc,
        toObject: () => ({ ...createdDoc }),
      });

      const result = await ratingService.createRating(
        { userId: 'USR-LEARNER' },
        createRatingPayload({ comment: '' })
      );

      expect(Rating.create).toHaveBeenCalledWith({
        fromUser: 'USR-LEARNER',
        toUser: 'USR-TEACHER',
        sessionId: 'SES-1',
        score: 5,
        comment: '',
      });
      expect(result).toEqual(createdDoc);
    });
  });

  describe('getRatingsForUser', () => {
    it('throws 400 when user id is missing', async () => {
      await expect(ratingService.getRatingsForUser('')).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      await expect(ratingService.getRatingsForUser('   ')).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('returns zeros and empty reviews when none exist', async () => {
      mockRatingFindChain([]);

      const result = await ratingService.getRatingsForUser('USR-TEACHER');

      expect(Rating.find).toHaveBeenCalledWith({ toUser: 'USR-TEACHER' });
      expect(result).toEqual({
        userId: 'USR-TEACHER',
        averageRating: 0,
        totalReviews: 0,
        reviews: [],
      });
    });

    it('computes average and returns reviews newest first', async () => {
      const reviews = [
        { score: 5, toUser: 'USR-TEACHER', createdAt: new Date('2026-05-02') },
        { score: 3, toUser: 'USR-TEACHER', createdAt: new Date('2026-05-01') },
      ];
      mockRatingFindChain(reviews);

      const result = await ratingService.getRatingsForUser('USR-TEACHER');

      expect(result.userId).toBe('USR-TEACHER');
      expect(result.totalReviews).toBe(2);
      expect(result.averageRating).toBe(4);
      expect(result.reviews).toEqual(reviews);
    });
  });
});
