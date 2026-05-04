const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth.middleware', () => {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();

    if (token === 'admin-token') {
      req.user = { userId: 'USR-ADMIN', role: 'admin' };
      return next();
    }

    if (token === 'user-token') {
      req.user = { userId: 'USR-USER-1', role: 'user' };
      return next();
    }

    return next(new Error('Unauthorized test token'));
  };
});

jest.mock('../../src/models/User', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
}));

const User = require('../../src/models/User');
const adminRoutes = require('../../src/routes/admin');
const errorHandler = require('../../src/middleware/error.middleware');

const createQueryChain = (result) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue(result),
});

describe('admin routes RBAC and user management', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  app.use(errorHandler);

  let users;

  const asDoc = (entity) => {
    return {
      ...entity,
      save: jest.fn().mockImplementation(async function save() {
        const index = users.findIndex((item) => item.userId === this.userId);
        users[index] = { ...users[index], ...this };
      }),
      deleteOne: jest.fn().mockImplementation(async function deleteOne() {
        users = users.filter((item) => item.userId !== this.userId);
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
        userId: 'USR-ADMIN',
        email: 'admin@test.com',
        passwordHash: 'secret',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        accountStatus: 'ACTIVE',
      },
      {
        userId: 'USR-USER-1',
        email: 'user1@test.com',
        passwordHash: 'secret',
        firstName: 'Regular',
        lastName: 'User',
        role: 'user',
        accountStatus: 'ACTIVE',
      },
      {
        userId: 'USR-USER-2',
        email: 'user2@test.com',
        passwordHash: 'secret',
        firstName: 'Another',
        lastName: 'User',
        role: 'user',
        accountStatus: 'ACTIVE',
      },
    ];

    User.find.mockImplementation(() => createQueryChain(users.map((u) => asDoc(u))));
    User.countDocuments.mockResolvedValue(users.length);
    User.findOne.mockImplementation(async (filter) => {
      const user = users.find((candidate) =>
        Object.entries(filter).every(([key, value]) => candidate[key] === value)
      );
      return user ? asDoc(user) : null;
    });
  });

  it('blocks normal user from admin endpoints', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', 'Bearer user-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows admin to list/get/update/promote/delete users', async () => {
    const listResponse = await request(app)
      .get('/api/admin/users?page=1&limit=10')
      .set('Authorization', 'Bearer admin-token');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.items).toHaveLength(3);
    expect(listResponse.body.data.items[0].passwordHash).toBeUndefined();

    const getSingleResponse = await request(app)
      .get('/api/admin/users/USR-USER-1')
      .set('Authorization', 'Bearer admin-token');

    expect(getSingleResponse.status).toBe(200);
    expect(getSingleResponse.body.data.userId).toBe('USR-USER-1');

    const updateResponse = await request(app)
      .put('/api/admin/users/USR-USER-1')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Updated Name',
        email: 'updated-user@test.com',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.firstName).toBe('Updated');
    expect(updateResponse.body.data.lastName).toBe('Name');
    expect(updateResponse.body.data.email).toBe('updated-user@test.com');

    const roleResponse = await request(app)
      .patch('/api/admin/users/USR-USER-1/role')
      .set('Authorization', 'Bearer admin-token')
      .send({
        role: 'admin',
      });

    expect(roleResponse.status).toBe(200);
    expect(roleResponse.body.data.role).toBe('admin');

    const deleteSelfResponse = await request(app)
      .delete('/api/admin/users/USR-ADMIN')
      .set('Authorization', 'Bearer admin-token');

    expect(deleteSelfResponse.status).toBe(400);
    expect(deleteSelfResponse.body.error.code).toBe('SELF_DELETE_FORBIDDEN');

    const deleteOtherResponse = await request(app)
      .delete('/api/admin/users/USR-USER-2')
      .set('Authorization', 'Bearer admin-token');

    expect(deleteOtherResponse.status).toBe(200);
    expect(deleteOtherResponse.body.data.userId).toBe('USR-USER-2');
  });
});
