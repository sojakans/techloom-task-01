const responseHandler = require('../utils/responseHandler');

/**
 * Global error handler middleware.
 * Catches all unhandled errors and formats them consistently.
 */
const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return responseHandler.validationError(res, 'Validation failed', errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    return responseHandler.conflict(res, `Duplicate value for: ${field}`);
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return responseHandler.validationError(res, `Invalid value for ${err.path}: ${err.value}`);
  }

  // Custom application errors
  if (err.statusCode) {
    return responseHandler.error(res, err.message, err.statusCode);
  }

  // Default server error
  return responseHandler.error(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
};

module.exports = errorHandler;
