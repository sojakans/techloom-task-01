const responseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middleware/asyncHandler');
const paymentService = require('../services/paymentService');

/**
 * @desc    Process payment (mock gateway)
 * @route   POST /api/payments
 * @body    { orderId, idempotencyKey, simulateOutcome }
 */
const processPayment = asyncHandler(async (req, res) => {
  const { orderId, idempotencyKey, simulateOutcome } = req.body;

  // Validation
  const errors = [];
  if (!orderId) errors.push('orderId is required');
  if (!idempotencyKey) errors.push('idempotencyKey is required');
  if (simulateOutcome && !['SUCCESS', 'FAILURE', 'TIMEOUT'].includes(simulateOutcome)) {
    errors.push('simulateOutcome must be SUCCESS, FAILURE, or TIMEOUT');
  }
  if (errors.length > 0) {
    return responseHandler.validationError(res, 'Validation failed', errors);
  }

  const result = await paymentService.processPayment({
    orderId,
    idempotencyKey,
    simulateOutcome: simulateOutcome || 'SUCCESS',
  });

  if (result.isDuplicate) {
    return responseHandler.success(res, {
      payment: result.payment,
      order: result.order,
      isDuplicate: true,
    }, 'Duplicate payment detected — returning existing result');
  }

  const statusCode = result.payment.status === 'SUCCESS' ? 200 : 200;
  responseHandler.success(res, {
    payment: result.payment,
    order: result.order,
    isDuplicate: false,
  }, `Payment ${result.payment.status.toLowerCase()}`);
});

module.exports = {
  processPayment,
};
