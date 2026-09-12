/**
 * Async handler wrapper to catch promise rejections in Express route handlers.
 * Eliminates the need for try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
