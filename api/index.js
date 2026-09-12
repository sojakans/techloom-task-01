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
    console.error('[API] Database connection error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to database',
      error: err.message,
    });
  }
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/simulations', simulationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'POS Fullstack Serverless API running on Vercel',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
