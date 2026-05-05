const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth.middleware', () => {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();

    if (token === 'teacher-token') {
      req.user = {
        userId: 'USR-TEACHER',
        role: 'MENTOR',
      };
      return next();
    }

    if (token === 'learner-token') {
      req.user = {
        userId: 'USR-LEARNER',
        role: 'LEARNER',
      };
      return next();
    }

    if (token === 'admin-token') {
      req.user = {
        userId: 'USR-ADMIN',
        role: 'ADMIN',
      };
      return next();
    }

    return next(new Error('Unauthorized test token'));
  };
});

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock('../../src/models/Session', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../src/models/CreditTransaction', () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../../src/models/Rating', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    startSession: jest.fn(),
  };
});

const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const CreditTransaction = require('../../src/models/CreditTransaction');
const Rating = require('../../src/models/Rating');

const sessionRoutes = require('../../src/routes/session.routes');
const creditRoutes = require('../../src/routes/credit.routes');
const ratingRoutes = require('../../src/routes/rating.routes');
const userRoutes = require('../../src/routes/user.routes');
const errorHandler = require('../../src/middleware/error.middleware');

const createQueryChain = (result) => {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
};

describe('session + credit + rating flow', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/credits', creditRoutes);
  app.use('/api/v1/ratings', ratingRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use(errorHandler);

  let users;
  let sessions;
  let transactions;
  let ratings;

  const asDoc = (entity, collectionName) => {
    return {
      ...entity,
      save: jest.fn().mockImplementation(async function save() {
        const collection = collectionName === 'sessions' ? sessions : users;
        const key = collectionName === 'sessions' ? 'sessionId' : 'userId';
        const index = collection.findIndex((item) => item[key] === this[key]);
        collection[index] = {
          ...collection[index],
          ...this,
        };
      }),
      toObject: jest.fn().mockImplementation(function toObject() {
        return { ...this };
      }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    users = [
      {
        userId: 'USR-LEARNER',
        accountStatus: 'ACTIVE',
        role: 'LEARNER',
        firstName: 'Learner',
        lastName: 'One',
        profilePicture: '',
        timeCredits: 10,
      },
      {
        userId: 'USR-TEACHER',
        accountStatus: 'ACTIVE',
        role: 'MENTOR',
        firstName: 'Teacher',
        lastName: 'One',
        profilePicture: '',
        timeCredits: 1,
      },
      {
        userId: 'USR-ADMIN',
        accountStatus: 'ACTIVE',
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'One',
        profilePicture: '',
        timeCredits: 0,
      },
    ];

    sessions = [];
    transactions = [];
    ratings = [];

    const mockMongoSession = {
      withTransaction: jest.fn(async (cb) => cb()),
      endSession: jest.fn(async () => undefined),
    };
    mongoose.startSession.mockResolvedValue(mockMongoSession);

    User.findOne.mockImplementation(async (filter) => {
      const user = users.find((candidate) => {
        return Object.entries(filter).every(([key, value]) => candidate[key] === value);
      });
      return user ? asDoc(user, 'users') : null;
    });

    User.find.mockImplementation((filter) => {
      const userIds = filter.userId?.$in || [];
      const result = users.filter((user) => userIds.includes(user.userId));
      return createQueryChain(result);
    });

    User.updateOne.mockImplementation(async (filter, update) => {
      const index = users.findIndex((candidate) => {
        const matchesUser = candidate.userId === filter.userId;
        const meetsCredit =
          filter.timeCredits?.$gte === undefined || candidate.timeCredits >= filter.timeCredits.$gte;
        return matchesUser && meetsCredit;
      });

      if (index === -1) {
        return { modifiedCount: 0 };
      }

      if (update.$inc?.timeCredits) {
        users[index].timeCredits += update.$inc.timeCredits;
      }

      return { modifiedCount: 1 };
    });

    Session.create.mockImplementation(async (payload) => {
      const created = {
        ...payload,
        completedAt: null,
        creditsTransferred: false,
        createdAt: new Date().toISOString(),
      };
      sessions.push(created);
      return asDoc(created, 'sessions');
    });

    Session.find.mockImplementation((filter) => {
      let result = [...sessions];

      if (filter.$or) {
        const userIds = filter.$or.map((condition) => condition.teacherId || condition.learnerId);
        result = result.filter((session) => {
          return userIds.includes(session.teacherId) || userIds.includes(session.learnerId);
        });
      } else if (filter.teacherId) {
        result = result.filter((session) => session.teacherId === filter.teacherId);
      } else if (filter.learnerId) {
        result = result.filter((session) => session.learnerId === filter.learnerId);
      }

      if (filter.status) {
        result = result.filter((session) => session.status === filter.status);
      }

      return createQueryChain(result);
    });

    Session.findOne.mockImplementation(async (filter) => {
      const key = filter.sessionId ? 'sessionId' : 'sessionId';
      const value = filter[key];
      const session = sessions.find((candidate) => candidate[key] === value);
      return session ? asDoc(session, 'sessions') : null;
    });

    CreditTransaction.create.mockImplementation(async ([payload]) => {
      transactions.push({
        ...payload,
        createdAt: new Date().toISOString(),
      });
      return [{ ...payload, toObject: () => ({ ...payload }) }];
    });

    CreditTransaction.find.mockImplementation((filter) => {
      const userId = filter.$or[0].fromUser;
      const result = transactions.filter((item) => item.fromUser === userId || item.toUser === userId);
      return createQueryChain(result);
    });

    Rating.findOne.mockImplementation(async (filter) => {
      return (
        ratings.find((item) => item.sessionId === filter.sessionId && item.fromUser === filter.fromUser) ||
        null
      );
    });

    Rating.create.mockImplementation(async (payload) => {
      const created = {
        ...payload,
        createdAt: new Date().toISOString(),
      };
      ratings.push(created);
      return {
        ...created,
        toObject: () => ({ ...created }),
      };
    });

    Rating.find.mockImplementation((filter) => {
      const result = ratings.filter((item) => item.toUser === filter.toUser);
      return createQueryChain(result);
    });
  });

  it('runs complete session-credit-rating lifecycle', async () => {
    const createResponse = await request(app)
      .post('/api/v1/sessions/request')
      .set('Authorization', 'Bearer learner-token')
      .send({
        teacherId: 'USR-TEACHER',
        skill: 'Node.js',
        duration: 2,
        date: '2026-06-01T10:00:00.000Z',
        message: 'Need backend mentoring',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.status).toBe('PENDING');
    const sessionId = createResponse.body.data.sessionId;

    const teacherListResponse = await request(app)
      .get('/api/v1/sessions?role=teacher&status=pending')
      .set('Authorization', 'Bearer teacher-token');

    expect(teacherListResponse.status).toBe(200);
    expect(teacherListResponse.body.data).toHaveLength(1);
    expect(teacherListResponse.body.data[0].teacher.userId).toBe('USR-TEACHER');
    expect(teacherListResponse.body.data[0].learner.userId).toBe('USR-LEARNER');

    const acceptResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/accept`)
      .set('Authorization', 'Bearer teacher-token');

    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.data.status).toBe('ACCEPTED');

    const completeResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/complete`)
      .set('Authorization', 'Bearer teacher-token')
      .send({
        actualDuration: 2.5,
      });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.data.status).toBe('COMPLETED');
    expect(completeResponse.body.data.actualDuration).toBe(2.5);
    expect(completeResponse.body.data.chargedCredits).toBe(2);
    expect(completeResponse.body.data.creditsTransferred).toBe(true);

    const learnerAfter = users.find((user) => user.userId === 'USR-LEARNER');
    const teacherAfter = users.find((user) => user.userId === 'USR-TEACHER');
    expect(learnerAfter.timeCredits).toBe(8);
    expect(teacherAfter.timeCredits).toBe(3);
    expect(transactions).toHaveLength(1);

    const secondCompleteResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/complete`)
      .set('Authorization', 'Bearer teacher-token');

    expect(secondCompleteResponse.status).toBe(409);

    const historyResponse = await request(app)
      .get('/api/v1/credits/history')
      .set('Authorization', 'Bearer learner-token');

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data).toHaveLength(1);
    expect(historyResponse.body.data[0]).toMatchObject({
      fromUser: 'USR-LEARNER',
      toUser: 'USR-TEACHER',
      amount: 2,
      sessionId,
      type: 'TRANSFER',
    });

    const ratingResponse = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', 'Bearer learner-token')
      .send({
        sessionId,
        toUserId: 'USR-TEACHER',
        score: 5,
        comment: 'Excellent mentor',
      });

    expect(ratingResponse.status).toBe(201);
    expect(ratingResponse.body.data.score).toBe(5);

    const duplicateRatingResponse = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', 'Bearer learner-token')
      .send({
        sessionId,
        toUserId: 'USR-TEACHER',
        score: 4,
      });

    expect(duplicateRatingResponse.status).toBe(409);

    const teacherRatingsResponse = await request(app)
      .get('/api/v1/users/USR-TEACHER/ratings')
      .set('Authorization', 'Bearer learner-token');

    expect(teacherRatingsResponse.status).toBe(200);
    expect(teacherRatingsResponse.body.data.averageRating).toBe(5);
    expect(teacherRatingsResponse.body.data.totalReviews).toBe(1);
  });

  it('charges only the actual duration when the session ends early', async () => {
    const createResponse = await request(app)
      .post('/api/v1/sessions/request')
      .set('Authorization', 'Bearer learner-token')
      .send({
        teacherId: 'USR-TEACHER',
        skill: 'MongoDB',
        duration: 2,
        date: '2026-06-06T10:00:00.000Z',
        message: 'Need schema design help',
      });

    const sessionId = createResponse.body.data.sessionId;

    const acceptResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/accept`)
      .set('Authorization', 'Bearer teacher-token');

    expect(acceptResponse.status).toBe(200);

    const completeResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/complete`)
      .set('Authorization', 'Bearer teacher-token')
      .send({
        actualDuration: 1.5,
      });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.data.actualDuration).toBe(1.5);
    expect(completeResponse.body.data.chargedCredits).toBe(1.5);

    const learnerAfter = users.find((user) => user.userId === 'USR-LEARNER');
    const teacherAfter = users.find((user) => user.userId === 'USR-TEACHER');
    expect(learnerAfter.timeCredits).toBe(8.5);
    expect(teacherAfter.timeCredits).toBe(2.5);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      fromUser: 'USR-LEARNER',
      toUser: 'USR-TEACHER',
      amount: 1.5,
      sessionId,
      type: 'TRANSFER',
    });
  });
});
