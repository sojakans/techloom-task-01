const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * Expiration Job
 * Background worker that periodically checks for RESERVED orders whose
 * reservation window has expired. For each expired order:
 *   1. Atomically transitions status from RESERVED -> EXPIRED (prevents double-processing)
 *   2. Releases reserved stock back to available
 *
 * IDEMPOTENCY: The atomic findOneAndUpdate with status: 'RESERVED' precondition
 * ensures that even if this job runs concurrently or multiple times, each order
 * is only expired once. If the status has already been changed, the update
 * returns null and no stock is released.
 */

let jobInterval = null;

/**
 * Process expired reservations.
 * Safe to call multiple times — idempotent by design.
 * @returns {Promise<number>} Number of orders expired in this run
 */
const processExpiredOrders = async () => {
  const now = new Date();

  // Find all RESERVED orders whose reservation has expired
  const expiredOrders = await Order.find({
    status: 'RESERVED',
    reservationExpiresAt: { $lte: now },
  });

  if (expiredOrders.length === 0) return 0;

  console.log(`[EXPIRATION JOB] Found ${expiredOrders.length} expired reservations`);

  let expiredCount = 0;

  for (const order of expiredOrders) {
    // Atomic: only update if still RESERVED (prevents race with payment or cancellation)
    const updated = await Order.findOneAndUpdate(
      {
        orderId: order.orderId,
        status: 'RESERVED', // Precondition: still reserved
      },
      {
        $set: {
          status: 'EXPIRED',
          paymentStatus: 'FAILED',
        },
      },
      { new: true }
    );

    if (!updated) {
      // Order was already transitioned by another process (payment, cancel, etc.)
      console.log(
        `[EXPIRATION JOB] Order ${order.orderId} already transitioned — skipping`
      );
      continue;
    }

    // Release reserved stock back to available
    for (const item of order.items) {
      await Product.findOneAndUpdate(
        {
          productId: item.productId,
          reservedStock: { $gte: item.quantity },
        },
        {
          $inc: {
            availableStock: item.quantity,
            reservedStock: -item.quantity,
          },
        }
      );
    }

    expiredCount++;
    console.log(
      `[EXPIRATION JOB] Expired order ${order.orderId} — ` +
      `released stock for ${order.items.length} item(s)`
    );
  }

  if (expiredCount > 0) {
    console.log(`[EXPIRATION JOB] Processed ${expiredCount} expired order(s)`);
  }

  return expiredCount;
};

/**
 * Start the periodic expiration job.
 * @param {number} intervalSec - Check interval in seconds
 */
const startExpirationJob = (intervalSec = 15) => {
  console.log(`[EXPIRATION JOB] Starting — checking every ${intervalSec}s`);

  // Run immediately on start
  processExpiredOrders().catch((err) =>
    console.error('[EXPIRATION JOB] Error:', err.message)
  );

  // Then run periodically
  jobInterval = setInterval(async () => {
    try {
      await processExpiredOrders();
    } catch (err) {
      console.error('[EXPIRATION JOB] Error:', err.message);
    }
  }, intervalSec * 1000);
};

/**
 * Stop the periodic expiration job.
 */
const stopExpirationJob = () => {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    console.log('[EXPIRATION JOB] Stopped');
  }
};

module.exports = {
  processExpiredOrders,
  startExpirationJob,
  stopExpirationJob,
};
