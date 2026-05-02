const ApiError = require('../utils/ApiError');

const normalizeDetail = (detail) => ({
  field: detail.path.join('.'),
  message: detail.message,
  type: detail.type,
});

const assignRequestProperty = (req, property, value) => {
  try {
    req[property] = value;
  } catch (error) {
    Object.defineProperty(req, property, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
};

const validate = (schema, property = 'body') => (req, res, next) => {
  if (!schema) {
    return next();
  }

  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map(normalizeDetail);
    return next(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details));
  }

  assignRequestProperty(req, property, value);
  next();
};

module.exports = validate;
