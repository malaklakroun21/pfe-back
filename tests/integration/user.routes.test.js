const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth.middleware', () => {
  return (req, res, next) => {
    req.user = {
      userId: 'USR-123',
      offeredSkills: ['React', 'Node.js'],
      wantedSkills: ['Docker'],
    };
    next();
  };
});

const userRoutes = require('../../src/routes/user.routes');

describe('user routes', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/v1/users', userRoutes);

  it('returns the current user offered skills', async () => {
    const response = await request(app).get('/api/v1/users/me/skills/offered');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Offered skills fetched successfully',
      data: {
        offeredSkills: ['React', 'Node.js'],
      },
    });
  });

  it('returns the current user wanted skills', async () => {
    const response = await request(app).get('/api/v1/users/me/skills/wanted');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Wanted skills fetched successfully',
      data: {
        wantedSkills: ['Docker'],
      },
    });
  });
});
