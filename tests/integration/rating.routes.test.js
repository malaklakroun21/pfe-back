const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth.middleware', () => {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (token === 'learner-token') {
      req.user = { userId: 'USR-LEARNER', role: 'LEARNER' };
      return next();
    }
    if (token === 'teacher-token') {
      req.user = { userId: 'USR-TEACHER', role: 'MENTOR' };
      return next();
    }
    return next(new Error('Unauthorized test token'));
  };
});

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Session', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Rating', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const Rating = require('../../src/models/Rating');

const ratingRoutes = require('../../src/routes/rating.routes');
const userRoutes = require('../../src/routes/user.routes');
const errorHandler = require('../../src/middleware/error.middleware');

const createQueryChain = (leanResult) => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(leanResult),
});

describe('rating routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/ratings', ratingRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/ratings', () => {
    it('returns 400 when Joi validation fails (missing score)', async () => {
      const res = await request(app)
        .post('/api/v1/ratings')
        .set('Authorization', 'Bearer learner-token')
        .send({
          sessionId: 'SES-1',
          toUserId: 'USR-TEACHER',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when score is out of range', async () => {
      const res = await request(app)
        .post('/api/v1/ratings')
        .set('Authorization', 'Bearer learner-token')
        .send({
          sessionId: 'SES-1',
          toUserId: 'USR-TEACHER',
          score: 6,
        });

      expect(res.status).toBe(400);
    });

    it('returns 201 when rating is created', async () => {
      Session.findOne.mockResolvedValue({
        sessionId: 'SES-1',
        teacherId: 'USR-TEACHER',
        learnerId: 'USR-LEARNER',
        status: 'COMPLETED',
      });
      User.findOne.mockResolvedValue({ userId: 'USR-TEACHER', accountStatus: 'ACTIVE' });
      Rating.findOne.mockResolvedValue(null);

      const created = {
        fromUser: 'USR-LEARNER',
        toUser: 'USR-TEACHER',
        sessionId: 'SES-1',
        score: 4,
        comment: 'Good',
      };
      Rating.create.mockResolvedValue({
        ...created,
        toObject: () => ({ ...created }),
      });

      const res = await request(app)
        .post('/api/v1/ratings')
        .set('Authorization', 'Bearer learner-token')
        .send({
          sessionId: 'SES-1',
          toUserId: 'USR-TEACHER',
          score: 4,
          comment: 'Good',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        fromUser: 'USR-LEARNER',
        toUser: 'USR-TEACHER',
        sessionId: 'SES-1',
        score: 4,
      });
    });
  });

  describe('GET /api/v1/users/:id/ratings', () => {
    it('returns rating summary for a user', async () => {
      const reviews = [{ score: 5, fromUser: 'USR-LEARNER', sessionId: 'SES-1' }];
      Rating.find.mockReturnValue(createQueryChain(reviews));

      const res = await request(app)
        .get('/api/v1/users/USR-TEACHER/ratings')
        .set('Authorization', 'Bearer teacher-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        userId: 'USR-TEACHER',
        averageRating: 5,
        totalReviews: 1,
      });
      expect(res.body.data.reviews).toHaveLength(1);
    });
  });
});
