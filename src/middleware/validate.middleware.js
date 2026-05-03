const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  if (!schema) {
    return next();
  }

  if (req.body === undefined) {
    return next(
      new ApiError(400, 'Request body must be valid JSON', 'VALIDATION_ERROR')
    );
  }

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(400, message, 'VALIDATION_ERROR'));
  }

  req.body = value;
  next();
};

module.exports = validate;
