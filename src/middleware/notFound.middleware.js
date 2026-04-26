const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
next(new ApiError(404, `Route ${req.originalUrl} not found`, 'NOT_FOUND'));
};

module.exports = notFound;