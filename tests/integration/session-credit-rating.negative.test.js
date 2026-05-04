const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth.middleware', () => {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();

    if (token === 'teacher-token') {
      req.user = { userId: 'USR-TEACHER', role: 'MENTOR' };
      return next();
    }

    if (token === 'learner-token') {
      req.user = { userId: 'USR-LEARNER', role: 'LEARNER' };
      return next();
    }

    if (token === 'other-token') {
      req.user = { userId: 'USR-OTHER', role: 'LEARNER' };
      return next();
    }

    if (token === 'admin-token') {
      req.user = { userId: 'USR-ADMIN', role: 'ADMIN' };
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
const ratingRoutes = require('../../src/routes/rating.routes');
const errorHandler = require('../../src/middleware/error.middleware');

const createQueryChain = (result) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

describe('session + credit + rating negative flows', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/ratings', ratingRoutes);
  app.use(errorHandler);

  let users;
  let sessions;
  let ratings;

  const asDoc = (entity, collectionName) => {
    return {
      ...entity,
      save: jest.fn().mockImplementation(async function save() {
        const collection = collectionName === 'sessions' ? sessions : users;
        const key = collectionName === 'sessions' ? 'sessionId' : 'userId';
        const idx = collection.findIndex((item) => item[key] === this[key]);
        collection[idx] = { ...collection[idx], ...this };
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
        timeCredits: 1,
      },
      {
        userId: 'USR-TEACHER',
        accountStatus: 'ACTIVE',
        role: 'MENTOR',
        firstName: 'Teacher',
        lastName: 'One',
        profilePicture: '',
        timeCredits: 0,
      },
      {
        userId: 'USR-OTHER',
        accountStatus: 'ACTIVE',
        role: 'LEARNER',
        firstName: 'Other',
        lastName: 'User',
        profilePicture: '',
        timeCredits: 5,
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
    ratings = [];

    const mockMongoSession = {
      withTransaction: jest.fn(async (cb) => cb()),
      endSession: jest.fn(async () => undefined),
    };
    mongoose.startSession.mockResolvedValue(mockMongoSession);

    User.findOne.mockImplementation(async (filter) => {
      const user = users.find((candidate) =>
        Object.entries(filter).every(([key, value]) => candidate[key] === value)
      );
      return user ? asDoc(user, 'users') : null;
    });

    User.find.mockImplementation((filter) => {
      const ids = filter.userId?.$in || [];
      return createQueryChain(users.filter((user) => ids.includes(user.userId)));
    });

    User.updateOne.mockImplementation(async (filter, update) => {
      const index = users.findIndex((candidate) => {
        const idMatch = candidate.userId === filter.userId;
        const creditMatch =
          filter.timeCredits?.$gte === undefined || candidate.timeCredits >= filter.timeCredits.$gte;
        return idMatch && creditMatch;
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
        creditsTransferred: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      sessions.push(created);
      return asDoc(created, 'sessions');
    });

    Session.find.mockImplementation((filter) => {
      let result = [...sessions];
      if (filter.status) {
        result = result.filter((item) => item.status === filter.status);
      }
      return createQueryChain(result);
    });

    Session.findOne.mockImplementation(async (filter) => {
      const session = sessions.find((candidate) => candidate.sessionId === filter.sessionId);
      return session ? asDoc(session, 'sessions') : null;
    });

    CreditTransaction.create.mockImplementation(async ([payload]) => {
      return [{ ...payload, toObject: () => ({ ...payload }) }];
    });

    Rating.findOne.mockImplementation(async (filter) => {
      return (
        ratings.find((item) => item.sessionId === filter.sessionId && item.fromUser === filter.fromUser) ||
        null
      );
    });

    Rating.create.mockImplementation(async (payload) => {
      const created = { ...payload, createdAt: new Date().toISOString() };
      ratings.push(created);
      return { ...created, toObject: () => ({ ...created }) };
    });

    Rating.find.mockImplementation((filter) => {
      return createQueryChain(ratings.filter((item) => item.toUser === filter.toUser));
    });
  });

  it('rejects accept/reject from non-teacher', async () => {
    const createRes = await request(app)
      .post('/api/v1/sessions/request')
      .set('Authorization', 'Bearer learner-token')
      .send({
        teacherId: 'USR-TEACHER',
        skill: 'MongoDB',
        duration: 1,
        date: '2026-06-02T10:00:00.000Z',
      });

    const sessionId = createRes.body.data.sessionId;

    const acceptByLearner = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/accept`)
      .set('Authorization', 'Bearer learner-token');
    expect(acceptByLearner.status).toBe(403);

    const rejectByOther = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/reject`)
      .set('Authorization', 'Bearer other-token');
    expect(rejectByOther.status).toBe(403);
  });

  it('rejects completion when session is not accepted', async () => {
    const createRes = await request(app)
      .post('/api/v1/sessions/request')
      .set('Authorization', 'Bearer learner-token')
      .send({
        teacherId: 'USR-TEACHER',
        skill: 'Express',
        duration: 1,
        date: '2026-06-03T10:00:00.000Z',
      });

    const sessionId = createRes.body.data.sessionId;
    const completePending = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/complete`)
      .set('Authorization', 'Bearer teacher-token');

    expect(completePending.status).toBe(409);
  });

  it('rejects completion if learner lacks enough credits', async () => {
    const createRes = await request(app)
      .post('/api/v1/sessions/request')
      .set('Authorization', 'Bearer learner-token')
      .send({
        teacherId: 'USR-TEACHER',
        skill: 'Node.js',
        duration: 2,
        date: '2026-06-04T10:00:00.000Z',
      });

    const sessionId = createRes.body.data.sessionId;

    const acceptRes = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/accept`)
      .set('Authorization', 'Bearer teacher-token');
    expect(acceptRes.status).toBe(200);

    const completeRes = await request(app)
      .patch(`/api/v1/sessions/${sessionId}/complete`)
      .set('Authorization', 'Bearer teacher-token');

    expect(completeRes.status).toBe(400);
    expect(completeRes.body.error.code).toBe('INSUFFICIENT_CREDITS');
  });

  it('rejects rating when session is not completed', async () => {
    const createRes = await request(app)
      .post('/api/v1/sessions/request')
      .set('Authorization', 'Bearer learner-token')
      .send({
        teacherId: 'USR-TEACHER',
        skill: 'Testing',
        duration: 1,
        date: '2026-06-05T10:00:00.000Z',
      });

    const sessionId = createRes.body.data.sessionId;
    await request(app)
      .patch(`/api/v1/sessions/${sessionId}/accept`)
      .set('Authorization', 'Bearer teacher-token');

    const rateRes = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', 'Bearer learner-token')
      .send({
        sessionId,
        toUserId: 'USR-TEACHER',
        score: 5,
      });

    expect(rateRes.status).toBe(409);
    expect(rateRes.body.error.code).toBe('SESSION_NOT_COMPLETED');
  });

  it('rejects invalid list filters for role and status', async () => {
    const invalidRoleResponse = await request(app)
      .get('/api/v1/sessions?role=owner')
      .set('Authorization', 'Bearer learner-token');

    expect(invalidRoleResponse.status).toBe(400);
    expect(invalidRoleResponse.body.error.code).toBe('VALIDATION_ERROR');

    const invalidStatusResponse = await request(app)
      .get('/api/v1/sessions?status=archived')
      .set('Authorization', 'Bearer learner-token');

    expect(invalidStatusResponse.status).toBe(400);
    expect(invalidStatusResponse.body.error.code).toBe('VALIDATION_ERROR');
  });
});
