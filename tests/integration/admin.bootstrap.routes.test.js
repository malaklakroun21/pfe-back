const express = require('express');
const request = require('supertest');

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/models/Admin', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/models/AuditLog', () => ({
  create: jest.fn(),
}));

const User = require('../../src/models/User');
const Admin = require('../../src/models/Admin');
const AuditLog = require('../../src/models/AuditLog');
const authRoutes = require('../../src/routes/auth.routes');
const errorHandler = require('../../src/middleware/error.middleware');

describe('admin bootstrap registration route', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_BOOTSTRAP_SECRET = 'bootstrap-secret';

    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (payload) => payload);
    Admin.findOne.mockResolvedValue(null);
    Admin.create.mockImplementation(async (payload) => payload);
    AuditLog.create.mockImplementation(async (payload) => payload);
  });

  it('rejects admin bootstrap registration without the configured secret', async () => {
    const response = await request(app).post('/api/v1/auth/register-admin').send({
      email: 'admin1@test.com',
      password: 'Password123',
      firstName: 'Super',
      lastName: 'Admin',
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('INVALID_ADMIN_BOOTSTRAP_SECRET');
  });

  it('registers an admin and creates the matching admin profile when the secret is valid', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register-admin')
      .set('x-admin-bootstrap-secret', 'bootstrap-secret')
      .send({
        email: 'admin1@test.com',
        password: 'Password123',
        firstName: 'Super',
        lastName: 'Admin',
        permissions: ['manage_users', 'view_dashboard'],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('ADMIN');
    expect(response.body.data.accessToken).toBeDefined();
    expect(Admin.create).toHaveBeenCalled();
    expect(AuditLog.create).toHaveBeenCalled();
  });
});
