const express = require('express');
const cors = require('cors');
const connectDB = require('../server/config/db');
const errorHandler = require('../server/middleware/errorHandler');

// Route imports
const productRoutes = require('../server/routes/productRoutes');
const cartRoutes = require('../server/routes/cartRoutes');
const orderRoutes = require('../server/routes/orderRoutes');
const paymentRoutes = require('../server/routes/paymentRoutes');
const simulationRoutes = require('../server/routes/simulationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Ensure database connection for serverless function execution
app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[API] Database connection error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: err.message,
    });
  }
});

// Mount routes supporting both with and without '/api' prefix
app.use('/api/products', productRoutes);
app.use('/products', productRoutes);

app.use('/api/cart', cartRoutes);
app.use('/cart', cartRoutes);

app.use('/api/orders', orderRoutes);
app.use('/orders', orderRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/payments', paymentRoutes);

app.use('/api/simulations', simulationRoutes);
app.use('/simulations', simulationRoutes);

// Health check endpoint
app.get(['/api/health', '/health', '/api', '/'], (_req, res) => {
  res.json({
    success: true,
    message: 'POS Fullstack Serverless API running on Vercel',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
