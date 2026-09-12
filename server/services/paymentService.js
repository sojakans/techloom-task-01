const Payment = require('../models/Payment');
const Order = require('../models/Order');
const generateId = require('../utils/generateId');
const inventoryService = require('./inventoryService');
const orderStateService = require('./orderStateService');

/**
 * Payment Service
 * Handles idempotent payment processing with mock gateway simulation.
 *
 * IDEMPOTENCY STRATEGY:
 * 1. Before processing, check if a Payment with the same idempotencyKey exists.
 * 2. If found, return the existing payment result (no double-charge).
 * 3. If not found, process payment and create a new Payment record.
 * 4. MongoDB unique index on idempotencyKey prevents race conditions.
 * 5. Concurrent collisions (E11000 duplicate key error) automatically fetch
 *    and return the winning transaction cleanly.
 */

/**
 * Process a payment for an order.
 * @param {object} params
 * @param {string} params.orderId - The order to pay for
 * @param {string} params.idempotencyKey - Client-generated unique key
 * @param {string} params.simulateOutcome - 'SUCCESS', 'FAILURE', or 'TIMEOUT'
 * @returns {Promise<{payment: object, order: object, isDuplicate: boolean}>}
 */
const processPayment = async ({ orderId, idempotencyKey, simulateOutcome = 'SUCCESS' }) => {
  // 1. Check for existing payment with same idempotency key
  const existingPayment = await Payment.findOne({ idempotencyKey });
  if (existingPayment) {
    console.log(`[PAYMENT] Duplicate payment detected for idempotencyKey: ${idempotencyKey}`);
    const order = await Order.findOne({ orderId: existingPayment.orderId });
    return { payment: existingPayment, order, isDuplicate: true };
  }

  // 2. Fetch and validate order
  const order = await Order.findOne({ orderId });
  if (!order) {
    const err = new Error(`Order not found: ${orderId}`);
    err.statusCode = 404;
    throw err;
  }

  // Check if order is already PAID (could be due to concurrent duplicate payment)
  if (order.status === 'PAID') {
    const existingPaid = await Payment.findOne({ idempotencyKey });
    if (existingPaid) {
      return { payment: existingPaid, order, isDuplicate: true };
    }
    const err = new Error('Cannot process payment: Order is already PAID');
    err.statusCode = 400;
    throw err;
  }

  // 3. Check if order can accept payment
  if (!orderStateService.canAcceptPayment(order.status)) {
    const err = new Error(
      `Cannot process payment for order in status: ${order.status}. ` +
      `Only RESERVED orders can be paid.`
    );
    err.statusCode = 400;
    throw err;
  }

  // 4. Check if reservation has expired (time-based guard)
  if (order.reservationExpiresAt && new Date() > order.reservationExpiresAt) {
    if (order.status === 'RESERVED') {
      order.status = 'EXPIRED';
      order.paymentStatus = 'FAILED';
      await order.save();
      await inventoryService.releaseStock(order.items);
      console.log(`[PAYMENT] Order ${orderId} expired during payment attempt`);
    }
    const err = new Error(`Order reservation has expired. Cannot process payment.`);
    err.statusCode = 400;
    throw err;
  }

  // 5. Simulate payment outcome
  let paymentStatus;
  let orderStatus;
  let orderPaymentStatus;

  switch (simulateOutcome) {
    case 'SUCCESS':
      paymentStatus = 'SUCCESS';
      orderStatus = 'PAID';
      orderPaymentStatus = 'PAID';
      break;

    case 'FAILURE':
      paymentStatus = 'FAILED';
      orderStatus = 'FAILED';
      orderPaymentStatus = 'FAILED';
      break;

    case 'TIMEOUT':
      await simulateTimeout(order);
      const refreshedOrder = await Order.findOne({ orderId });
      if (refreshedOrder.status === 'EXPIRED') {
        const err = new Error(
          'Payment timed out and order reservation expired. Stock has been released.'
        );
        err.statusCode = 400;
        throw err;
      }
      if (refreshedOrder.status !== 'RESERVED') {
        const err = new Error(
          `Order status changed during timeout: ${refreshedOrder.status}. Cannot complete payment.`
        );
        err.statusCode = 400;
        throw err;
      }
      paymentStatus = 'SUCCESS';
      orderStatus = 'PAID';
      orderPaymentStatus = 'PAID';
      break;

    default:
      const err2 = new Error(
        `Invalid payment outcome: ${simulateOutcome}. Must be SUCCESS, FAILURE, or TIMEOUT.`
      );
      err2.statusCode = 400;
      throw err2;
  }

  // 6. Create payment record (guarded against concurrent duplicate key insertion)
  let payment;
  try {
    payment = await Payment.create({
      paymentId: generateId.payment(),
      orderId,
      amount: order.totalAmount,
      status: paymentStatus,
      idempotencyKey,
      paymentMethod: 'SIMULATED_GATEWAY',
      metadata: { simulateOutcome },
    });
  } catch (createErr) {
    if (createErr.code === 11000) {
      // Duplicate key collision — fetch and return winning record
      console.log(`[PAYMENT] Concurrent duplicate key collision caught for ${idempotencyKey}`);
      const winner = await Payment.findOne({ idempotencyKey });
      const currentOrder = await Order.findOne({ orderId });
      return { payment: winner, order: currentOrder, isDuplicate: true };
    }
    throw createErr;
  }

  // 7. Update order status
  if (orderStatus === 'PAID') {
    await inventoryService.confirmReservation(order.items);
  } else if (orderStateService.shouldReleaseStock(orderStatus)) {
    await inventoryService.releaseStock(order.items);
  }

  order.status = orderStatus;
  order.paymentStatus = orderPaymentStatus;
  await order.save();

  console.log(`[PAYMENT] Payment ${payment.paymentId} (${paymentStatus}) for order ${orderId}`);

  return { payment, order, isDuplicate: false };
};

const simulateTimeout = (order) => {
  return new Promise((resolve) => {
    console.log(`[PAYMENT] Simulating timeout for order ${order.orderId} (3s delay)...`);
    setTimeout(resolve, 3000);
  });
};

module.exports = {
  processPayment,
};
