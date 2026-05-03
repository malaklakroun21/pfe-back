const validate = require('../../../src/middleware/validate.middleware');

describe('validate middleware', () => {
  it('returns a validation error when the request body is missing', () => {
    const middleware = validate({
      validate: jest.fn(),
    });

    const req = {};
    const next = jest.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request body must be valid JSON',
      })
    );
  });
});
