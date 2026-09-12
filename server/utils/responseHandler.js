/**
 * Standardized API response formatter.
 * Ensures consistent JSON response shape across all endpoints.
 */
const responseHandler = {
  success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  },

  created(res, data = null, message = 'Created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  },

  error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
    };
    if (errors) {
      response.errors = errors;
    }
    return res.status(statusCode).json(response);
  },

  validationError(res, message = 'Validation failed', errors = null) {
    return this.error(res, message, 400, errors);
  },

  notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  },

  conflict(res, message = 'Conflict') {
    return this.error(res, message, 409);
  },
};

module.exports = responseHandler;
