const mongoSanitize = require('express-mongo-sanitize');

const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body);
  }

  if (req.params) {
    req.params = mongoSanitize.sanitize(req.params);
  }

  if (req.headers) {
    req.headers = mongoSanitize.sanitize(req.headers);
  }

  Object.defineProperty(req, 'query', {
    value: mongoSanitize.sanitize(req.query || {}),
    writable: true,
    configurable: true,
    enumerable: true,
  });

  next();
};

module.exports = sanitizeRequest;
