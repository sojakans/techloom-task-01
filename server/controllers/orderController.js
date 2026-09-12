const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const generateId = require('../utils/generateId');
const responseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middleware/asyncHandler');
const inventoryService = require('../services/inventoryService');
const orderStateService = require('../services/orderStateService');

const RESERVATION_TTL_SEC = parseInt(process.env.RESERVATION_TTL_SEC) || 300;

/**
 * @desc    Checkout: Create order from cart with stock reservation
 * @route   POST /api/orders/checkout
 * @body    { sessionId, cartId }
 */
const checkout = asyncHandler(async (req, res) => {
  const { sessionId, cartId } = req.body;

  if (!sessionId || !cartId) {
    return responseHandler.validationError(res, 'sessionId and cartId are required');
  }

  // 1. Fetch and validate cart
  const cart = await Cart.findOne({ cartId, sessionId, status: 'ACTIVE' });
  if (!cart) {
    return responseHandler.notFound(res, 'No active cart found with the given ID and session');
  }
  if (!cart.items || cart.items.length === 0) {
    return responseHandler.validationError(res, 'Cart is empty. Add items before checkout.');
  }

  // 2. Re-verify product prices from database (never trust frontend values)
  const verifiedItems = [];
  for (const item of cart.items) {
    const product = await Product.findOne({ productId: item.productId });
    if (!product) {
      return responseHandler.notFound(res, `Product not found: ${item.productId}`);
    }
    verifiedItems.push({
      productId: product.productId,
      name: product.name,
      price: product.price,       // Use DB price, not cart price
      quantity: item.quantity,
    });
  }

  // 3. Calculate total from verified prices
  const totalAmount = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 4. Create order in PENDING state
  const orderId = generateId.order();
  const reservationExpiresAt = new Date(Date.now() + RESERVATION_TTL_SEC * 1000);

  // 5. Attempt atomic stock reservation (CONCURRENCY-SAFE)
  try {
    await inventoryService.reserveStock(verifiedItems);
  } catch (stockError) {
    // Stock reservation failed — create order as FAILED
    const failedOrder = await Order.create({
      orderId,
      cartId: cart.cartId,
      sessionId,
      items: verifiedItems,
      totalAmount,
      status: 'FAILED',
      paymentStatus: 'UNPAID',
    });

    console.log(`[ORDER] Checkout FAILED for ${orderId}: ${stockError.message}`);
    return responseHandler.error(res, stockError.message, stockError.statusCode || 409);
  }

  // 6. Stock reserved successfully — create order as RESERVED
  const order = await Order.create({
    orderId,
    cartId: cart.cartId,
    sessionId,
    items: verifiedItems,
    totalAmount,
    status: 'RESERVED',
    paymentStatus: 'UNPAID',
    reservationExpiresAt,
  });

  // 7. Mark cart as checked out
  cart.status = 'CHECKED_OUT';
  await cart.save();

  console.log(
    `[ORDER] Checkout SUCCESS: ${orderId} — ${verifiedItems.length} items, ` +
    `total: $${totalAmount.toFixed(2)}, expires: ${reservationExpiresAt.toISOString()}`
  );

  responseHandler.created(res, order, 'Order created with stock reserved');
});

/**
 * @desc    Get all orders (with optional status filter)
 * @route   GET /api/orders
 * @query   status, sessionId
 */
const getOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status.toUpperCase();
  if (req.query.sessionId) filter.sessionId = req.query.sessionId;

  const orders = await Order.find(filter).sort({ createdAt: -1 });
  responseHandler.success(res, orders, `Found ${orders.length} order(s)`);
});

/**
 * @desc    Get single order by orderId
 * @route   GET /api/orders/:orderId
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) {
    return responseHandler.notFound(res, `Order not found: ${req.params.orderId}`);
  }

  // Add computed fields
  const orderData = order.toObject();
  if (order.status === 'RESERVED' && order.reservationExpiresAt) {
    const now = new Date();
    const remaining = Math.max(0, order.reservationExpiresAt.getTime() - now.getTime());
    orderData.reservationRemainingMs = remaining;
    orderData.reservationRemainingFormatted = formatMs(remaining);
  }

  responseHandler.success(res, orderData);
});

/**
 * @desc    Cancel an order
 * @route   POST /api/orders/:orderId/cancel
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) {
    return responseHandler.notFound(res, `Order not found: ${req.params.orderId}`);
  }

  // Already cancelled
  if (order.status === 'CANCELLED') {
    return responseHandler.success(res, order, 'Order is already cancelled');
  }

  // Validate transition
  orderStateService.validateTransition(order.status, 'CANCELLED');

  const previousStatus = order.status;

  // Release stock if order was RESERVED or PAID
  if (previousStatus === 'RESERVED') {
    await inventoryService.releaseStock(order.items);
    console.log(`[ORDER] Released reserved stock for cancelled order ${order.orderId}`);
  } else if (previousStatus === 'PAID') {
    // For PAID cancellations, restore stock from confirmed (increase availableStock)
    for (const item of order.items) {
      await Product.findOneAndUpdate(
        { productId: item.productId },
        { $inc: { availableStock: item.quantity } }
      );
    }
    order.paymentStatus = 'REFUNDED';
    console.log(`[ORDER] Restored stock for cancelled PAID order ${order.orderId}`);
  }

  order.status = 'CANCELLED';
  await order.save();

  console.log(`[ORDER] Cancelled: ${order.orderId} (was ${previousStatus})`);
  responseHandler.success(res, order, 'Order cancelled successfully');
});

/**
 * @desc    Get order statistics/summary
 * @route   GET /api/orders/stats
 */
const getOrderStats = asyncHandler(async (req, res) => {
  const [stats] = await Order.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        reserved: { $sum: { $cond: [{ $eq: ['$status', 'RESERVED'] }, 1, 0] } },
        paid: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$totalAmount', 0] },
        },
      },
    },
  ]);

  const productStats = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalAvailableStock: { $sum: '$availableStock' },
        totalReservedStock: { $sum: '$reservedStock' },
      },
    },
  ]);

  responseHandler.success(res, {
    orders: stats || {
      total: 0, pending: 0, reserved: 0, paid: 0,
      cancelled: 0, expired: 0, failed: 0, totalRevenue: 0,
    },
    products: productStats[0] || {
      totalProducts: 0, totalAvailableStock: 0, totalReservedStock: 0,
    },
  });
});

/** Format milliseconds to mm:ss */
function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

module.exports = {
  checkout,
  getOrders,
  getOrder,
  cancelOrder,
  getOrderStats,
};
