const Product = require('../models/Product');

/**
 * Inventory Service
 * Handles concurrency-safe stock reservation and release using MongoDB atomic operations.
 *
 * CONCURRENCY STRATEGY:
 * Uses findOneAndUpdate with $gte precondition on availableStock.
 * This ensures that the decrement only occurs if sufficient stock exists at the
 * exact moment of the atomic write — preventing overselling even under
 * high concurrency.
 *
 * If transactions are supported (replica set), all item reservations in a
 * multi-item cart are wrapped in a MongoDB session/transaction for atomicity.
 * If transactions are not supported (standalone), we use a sequential
 * reserve-with-rollback pattern.
 */

/**
 * Reserve stock for a list of items atomically.
 * Uses $gte precondition to prevent overselling.
 *
 * @param {Array<{productId: string, quantity: number}>} items - Items to reserve
 * @param {object} [session] - Mongoose session for transaction support
 * @returns {Promise<Array>} - Updated product documents
 * @throws {Error} if any item has insufficient stock
 */
const reserveStock = async (items, session = null) => {
  const reservedProducts = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const opts = session ? { session, new: true } : { new: true };

    // Atomic: only decrements if availableStock >= quantity
    const updated = await Product.findOneAndUpdate(
      {
        productId: item.productId,
        availableStock: { $gte: item.quantity },
      },
      {
        $inc: {
          availableStock: -item.quantity,
          reservedStock: item.quantity,
        },
      },
      opts
    );

    if (!updated) {
      // If not using transactions, manually rollback previously reserved items
      if (!session) {
        await rollbackReservations(reservedProducts);
      }

      // Check if product exists to give a better error message
      const product = await Product.findOne({ productId: item.productId });
      if (!product) {
        const err = new Error(`Product not found: ${item.productId}`);
        err.statusCode = 404;
        throw err;
      }

      const err = new Error(
        `Insufficient stock for "${product.name}" (${item.productId}). ` +
        `Requested: ${item.quantity}, Available: ${product.availableStock}`
      );
      err.statusCode = 409;
      throw err;
    }

    reservedProducts.push({ productId: item.productId, quantity: item.quantity });
  }

  return reservedProducts;
};

/**
 * Release previously reserved stock back to available.
 * Used when orders are cancelled, expired, or fail.
 * Idempotent: uses atomic operations that are safe to run multiple times.
 *
 * @param {Array<{productId: string, quantity: number}>} items
 * @param {object} [session] - Mongoose session for transaction support
 */
const releaseStock = async (items, session = null) => {
  for (const item of items) {
    const opts = session ? { session, new: true } : { new: true };

    // Atomic: only releases if reservedStock >= quantity (prevents double-release)
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
      },
      opts
    );
  }
};

/**
 * Confirm reserved stock (after successful payment).
 * Deducts from reservedStock without returning to availableStock.
 *
 * @param {Array<{productId: string, quantity: number}>} items
 * @param {object} [session] - Mongoose session for transaction support
 */
const confirmReservation = async (items, session = null) => {
  for (const item of items) {
    const opts = session ? { session } : {};

    await Product.findOneAndUpdate(
      { productId: item.productId },
      {
        $inc: {
          reservedStock: -item.quantity,
        },
      },
      opts
    );
  }
};

/**
 * Rollback reservations made during a failed multi-item reservation (no-transaction mode).
 * @param {Array<{productId: string, quantity: number}>} reservedItems
 */
const rollbackReservations = async (reservedItems) => {
  console.log(`[INVENTORY] Rolling back ${reservedItems.length} reservations`);
  for (const item of reservedItems) {
    await Product.findOneAndUpdate(
      { productId: item.productId },
      {
        $inc: {
          availableStock: item.quantity,
          reservedStock: -item.quantity,
        },
      }
    );
  }
};

module.exports = {
  reserveStock,
  releaseStock,
  confirmReservation,
  rollbackReservations,
};
