const Cart = require('../models/Cart');
const Product = require('../models/Product');
const generateId = require('../utils/generateId');
const responseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get or create active cart for a session
 * @route   GET /api/cart/:sessionId
 */
const getCart = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  let cart = await Cart.findOne({ sessionId, status: 'ACTIVE' });
  if (!cart) {
    cart = await Cart.create({
      cartId: generateId.cart(),
      sessionId,
      items: [],
      status: 'ACTIVE',
    });
    console.log(`[CART] Created new cart ${cart.cartId} for session ${sessionId}`);
  }

  responseHandler.success(res, cart);
});

/**
 * @desc    Add or update item in cart
 * @route   POST /api/cart/items
 * @body    { sessionId, productId, quantity }
 */
const addItem = asyncHandler(async (req, res) => {
  const { sessionId, productId, quantity } = req.body;

  // Validation
  const errors = [];
  if (!sessionId) errors.push('Session ID is required');
  if (!productId) errors.push('Product ID is required');
  if (!quantity || typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) {
    errors.push('Quantity must be a positive integer');
  }
  if (errors.length > 0) {
    return responseHandler.validationError(res, 'Validation failed', errors);
  }

  // Verify product exists and has stock (informational check, not reservation)
  const product = await Product.findOne({ productId });
  if (!product) {
    return responseHandler.notFound(res, `Product not found: ${productId}`);
  }

  // Get or create active cart
  let cart = await Cart.findOne({ sessionId, status: 'ACTIVE' });
  if (!cart) {
    cart = await Cart.create({
      cartId: generateId.cart(),
      sessionId,
      items: [],
      status: 'ACTIVE',
    });
  }

  // Check if item already in cart
  const existingItemIndex = cart.items.findIndex((i) => i.productId === productId);
  if (existingItemIndex >= 0) {
    cart.items[existingItemIndex].quantity = quantity;
    cart.items[existingItemIndex].price = product.price;
    cart.items[existingItemIndex].name = product.name;
  } else {
    cart.items.push({
      productId,
      name: product.name,
      price: product.price,
      quantity,
    });
  }

  await cart.save();
  responseHandler.success(res, cart, 'Item added to cart');
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:productId
 * @query   sessionId
 */
const removeItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { sessionId } = req.query;

  if (!sessionId) {
    return responseHandler.validationError(res, 'Session ID is required as query parameter');
  }

  const cart = await Cart.findOne({ sessionId, status: 'ACTIVE' });
  if (!cart) {
    return responseHandler.notFound(res, 'No active cart found for this session');
  }

  const itemIndex = cart.items.findIndex((i) => i.productId === productId);
  if (itemIndex === -1) {
    return responseHandler.notFound(res, `Product ${productId} not found in cart`);
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  responseHandler.success(res, cart, 'Item removed from cart');
});

/**
 * @desc    Clear all items from cart
 * @route   DELETE /api/cart/:sessionId
 */
const clearCart = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const cart = await Cart.findOne({ sessionId, status: 'ACTIVE' });
  if (!cart) {
    return responseHandler.notFound(res, 'No active cart found');
  }

  cart.items = [];
  await cart.save();

  responseHandler.success(res, cart, 'Cart cleared');
});

module.exports = {
  getCart,
  addItem,
  removeItem,
  clearCart,
};
