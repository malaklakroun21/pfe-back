const errorHandler = (err, req, res, next) => {
const statusCode = err.statusCode || 500;
const message = err.message || 'Internal Server Error';
const code = err.code || 'INTERNAL_ERROR';

if (process.env.NODE_ENV === 'development') {
    console.error(err);
}

res.status(statusCode).json({
    success: false,
    error: { code, message },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
});
};

module.exports = errorHandler;