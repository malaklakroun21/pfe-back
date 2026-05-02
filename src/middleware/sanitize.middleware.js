const expressMongoSanitize = require('express-mongo-sanitize');

const sanitize = (target, options) => expressMongoSanitize.sanitize(target, options);

const mongoSanitize = (options = {}) => {
  return (req, res, next) => {
    if (req.body) {
      req.body = sanitize(req.body, options);
    }

    if (req.params) {
      req.params = sanitize(req.params, options);
    }

    if (req.headers) {
      req.headers = sanitize(req.headers, options);
    }

    Object.defineProperty(req, 'query', {
      value: sanitize(req.query || {}, options),
      writable: true,
      configurable: true,
      enumerable: true,
    });

    next();
  };
};

module.exports = mongoSanitize;
