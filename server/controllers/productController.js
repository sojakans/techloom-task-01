const Product = require('../models/Product');
const generateId = require('../utils/generateId');
const responseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all products
 * @route   GET /api/products
 */
const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  responseHandler.success(res, products, 'Products retrieved successfully');
});

/**
 * @desc    Get single product by productId
 * @route   GET /api/products/:id
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ productId: req.params.id });
  if (!product) {
    return responseHandler.notFound(res, `Product not found: ${req.params.id}`);
  }
  responseHandler.success(res, product);
});

/**
 * @desc    Create a new product
 * @route   POST /api/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const { name, price, availableStock } = req.body;

  // Backend validation
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Product name is required and must be a non-empty string');
  }
  if (price === undefined || price === null || typeof price !== 'number' || price < 0) {
    errors.push('Price is required and must be a non-negative number');
  }
  if (availableStock === undefined || typeof availableStock !== 'number' || availableStock < 0 || !Number.isInteger(availableStock)) {
    errors.push('Available stock is required and must be a non-negative integer');
  }
  if (errors.length > 0) {
    return responseHandler.validationError(res, 'Validation failed', errors);
  }

  const product = await Product.create({
    productId: generateId.product(),
    name: name.trim(),
    price,
    availableStock,
    reservedStock: 0,
  });

  console.log(`[PRODUCT] Created: ${product.productId} — "${product.name}" (stock: ${product.availableStock})`);
  responseHandler.created(res, product, 'Product created successfully');
});

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { name, price, availableStock } = req.body;
  const updateFields = {};
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Product name must be a non-empty string');
    } else {
      updateFields.name = name.trim();
    }
  }
  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      errors.push('Price must be a non-negative number');
    } else {
      updateFields.price = price;
    }
  }
  if (availableStock !== undefined) {
    if (typeof availableStock !== 'number' || availableStock < 0 || !Number.isInteger(availableStock)) {
      errors.push('Available stock must be a non-negative integer');
    } else {
      updateFields.availableStock = availableStock;
    }
  }
  if (errors.length > 0) {
    return responseHandler.validationError(res, 'Validation failed', errors);
  }

  const product = await Product.findOneAndUpdate(
    { productId: req.params.id },
    updateFields,
    { new: true, runValidators: true }
  );

  if (!product) {
    return responseHandler.notFound(res, `Product not found: ${req.params.id}`);
  }

  console.log(`[PRODUCT] Updated: ${product.productId}`);
  responseHandler.success(res, product, 'Product updated successfully');
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ productId: req.params.id });
  if (!product) {
    return responseHandler.notFound(res, `Product not found: ${req.params.id}`);
  }

  // Prevent deletion if there are reserved items
  if (product.reservedStock > 0) {
    return responseHandler.conflict(
      res,
      `Cannot delete product with ${product.reservedStock} reserved items. Wait for reservations to expire or be completed.`
    );
  }

  await Product.deleteOne({ productId: req.params.id });
  console.log(`[PRODUCT] Deleted: ${product.productId}`);
  responseHandler.success(res, { productId: product.productId }, 'Product deleted successfully');
});

/**
 * @desc    Get stock status for a specific product
 * @route   GET /api/products/:id/stock
 */
const getProductStock = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ productId: req.params.id });
  if (!product) {
    return responseHandler.notFound(res, `Product not found: ${req.params.id}`);
  }
  responseHandler.success(res, {
    productId: product.productId,
    name: product.name,
    availableStock: product.availableStock,
    reservedStock: product.reservedStock,
    totalStock: product.availableStock + product.reservedStock,
  }, 'Stock retrieved successfully');
});

/**
 * @desc    Seed products for testing
 * @route   POST /api/products/seed
 */
const seedProducts = asyncHandler(async (req, res) => {
  const defaultProducts = [
    { name: 'Wireless Keyboard', price: 59.99, availableStock: 25 },
    { name: 'USB-C Hub (7-in-1)', price: 39.99, availableStock: 15 },
    { name: 'Noise-Cancelling Headphones', price: 149.99, availableStock: 10 },
    { name: 'Mechanical Mouse', price: 29.99, availableStock: 30 },
    { name: '4K Webcam', price: 89.99, availableStock: 8 },
    { name: 'Monitor Stand (Aluminum)', price: 44.99, availableStock: 20 },
    { name: 'Laptop Sleeve 15"', price: 24.99, availableStock: 50 },
    { name: 'Desk Lamp (LED)', price: 34.99, availableStock: 12 },
  ];

  const products = [];
  for (const p of defaultProducts) {
    const existing = await Product.findOne({ name: p.name });
    if (!existing) {
      const product = await Product.create({
        productId: generateId.product(),
        ...p,
        reservedStock: 0,
      });
      products.push(product);
    }
  }

  console.log(`[SEED] Created ${products.length} products`);
  responseHandler.created(res, products, `Seeded ${products.length} products`);
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStock,
  seedProducts,
};
