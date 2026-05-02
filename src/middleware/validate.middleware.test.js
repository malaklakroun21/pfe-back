const Joi = require('joi');

const validate = require('./validate.middleware');

const createReq = (overrides = {}) => ({
  body: {},
  query: {},
  params: {},
  ...overrides,
});

describe('validate.middleware', () => {
  it('validates req.body by default and strips unknown fields', () => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });
    const req = createReq({
      body: {
        email: 'test@example.com',
        role: 'admin',
      },
    });
    const next = jest.fn();

    validate(schema)(req, {}, next);

    expect(req.body).toEqual({ email: 'test@example.com' });
    expect(next).toHaveBeenCalledWith();
  });

  it('validates a specified request property', () => {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
    });
    const req = createReq({
      query: {
        page: '2',
        ignored: true,
      },
    });
    const next = jest.fn();

    validate(schema, 'query')(req, {}, next);

    expect(req.query).toEqual({ page: 2 });
    expect(next).toHaveBeenCalledWith();
  });

  it('passes a 400 ApiError with detailed validation errors', () => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
    });
    const req = createReq({
      body: {
        email: 'not-an-email',
        password: 'short',
      },
    });
    const next = jest.fn();

    validate(schema)(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            type: 'string.email',
          }),
          expect.objectContaining({
            field: 'password',
            type: 'string.min',
          }),
        ]),
      })
    );
  });
});
