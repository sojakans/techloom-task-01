const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const generateId = require('../utils/generateId');
const responseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middleware/asyncHandler');
const inventoryService = require('../services/inventoryService');

/**
 * @desc    Run concurrency stress test
 * @route   POST /api/simulations/stress-test
 * @body    { productName, initialStock, concurrentRequests, quantityPerRequest }
 */
const stressTest = asyncHandler(async (req, res) => {
  const {
    productName = 'Stress Test Item',
    initialStock = 5,
    concurrentRequests = 10,
    quantityPerRequest = 1,
  } = req.body;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[STRESS TEST] Starting concurrency test`);
  console.log(`  Product: "${productName}"`);
  console.log(`  Initial Stock: ${initialStock}`);
  console.log(`  Concurrent Requests: ${concurrentRequests}`);
  console.log(`  Quantity per Request: ${quantityPerRequest}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Create or reset test product
  let product = await Product.findOne({ name: productName });
  if (product) {
    product.availableStock = initialStock;
    product.reservedStock = 0;
    await product.save();
  } else {
    product = await Product.create({
      productId: generateId.product(),
      name: productName,
      price: 9.99,
      availableStock: initialStock,
      reservedStock: 0,
    });
  }

  console.log(`[STRESS TEST] Product ready: ${product.productId} (stock: ${initialStock})`);

  // 2. Fire N concurrent checkout requests
  const startTime = Date.now();
  const results = [];

  const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
    const sessionId = `stress-session-${i}`;
    const cartId = generateId.cart();

    try {
      // Create cart for this "user"
      await Cart.create({
        cartId,
        sessionId,
        items: [
          {
            productId: product.productId,
            name: product.name,
            price: product.price,
            quantity: quantityPerRequest,
          },
        ],
        status: 'ACTIVE',
      });

      // Attempt to reserve stock (the core concurrency test)
      await inventoryService.reserveStock([
        { productId: product.productId, quantity: quantityPerRequest },
      ]);

      // Create order
      const order = await Order.create({
        orderId: generateId.order(),
        cartId,
        sessionId,
        items: [
          {
            productId: product.productId,
            name: product.name,
            price: product.price,
            quantity: quantityPerRequest,
          },
        ],
        totalAmount: product.price * quantityPerRequest,
        status: 'RESERVED',
        paymentStatus: 'UNPAID',
        reservationExpiresAt: new Date(Date.now() + 300000),
      });

      results.push({
        request: i + 1,
        sessionId,
        orderId: order.orderId,
        status: 'RESERVED',
        success: true,
      });
    } catch (err) {
      results.push({
        request: i + 1,
        sessionId,
        status: 'FAILED',
        success: false,
        error: err.message,
      });
    }
  });

  await Promise.all(promises);
  const elapsed = Date.now() - startTime;

  // 3. Verify results
  const finalProduct = await Product.findOne({ productId: product.productId });
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const maxPossible = Math.floor(initialStock / quantityPerRequest);

  const verification = {
    stockNeverNegative: finalProduct.availableStock >= 0,
    noOverselling: successCount <= maxPossible,
    stockConsistent:
      finalProduct.availableStock + finalProduct.reservedStock <= initialStock,
    exactReservations: successCount === maxPossible,
  };

  const allPassed = Object.values(verification).every(Boolean);

  console.log(`\n[STRESS TEST] Results:`);
  console.log(`  Successful: ${successCount}/${concurrentRequests}`);
  console.log(`  Failed: ${failCount}/${concurrentRequests}`);
  console.log(`  Final Available Stock: ${finalProduct.availableStock}`);
  console.log(`  Final Reserved Stock: ${finalProduct.reservedStock}`);
  console.log(`  Elapsed: ${elapsed}ms`);
  console.log(`  Verification: ${allPassed ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}`);
  console.log(`${'='.repeat(60)}\n`);

  responseHandler.success(res, {
    testConfig: {
      productId: product.productId,
      productName,
      initialStock,
      concurrentRequests,
      quantityPerRequest,
    },
    results: results.sort((a, b) => a.request - b.request),
    summary: {
      successCount,
      failCount,
      maxPossible,
      elapsedMs: elapsed,
    },
    finalState: {
      availableStock: finalProduct.availableStock,
      reservedStock: finalProduct.reservedStock,
    },
    verification,
    allTestsPassed: allPassed,
  }, allPassed ? 'Concurrency test PASSED — no overselling detected' : 'Concurrency test FAILED — overselling detected!');
});

/**
 * @desc    Reset all test data
 * @route   POST /api/simulations/reset
 */
const resetTestData = asyncHandler(async (req, res) => {
  const deletedOrders = await Order.deleteMany({});
  const deletedCarts = await Cart.deleteMany({});
  const deletedPayments = await Payment.deleteMany({});

  // Reset all product stock
  await Product.updateMany({}, { reservedStock: 0 });

  console.log(`[RESET] Cleared: ${deletedOrders.deletedCount} orders, ${deletedCarts.deletedCount} carts, ${deletedPayments.deletedCount} payments`);

  responseHandler.success(res, {
    deletedOrders: deletedOrders.deletedCount,
    deletedCarts: deletedCarts.deletedCount,
    deletedPayments: deletedPayments.deletedCount,
  }, 'Test data reset successfully');
});

module.exports = {
  stressTest,
  resetTestData,
};
