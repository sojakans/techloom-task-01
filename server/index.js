require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { startExpirationJob } = require('./jobs/expirationJob');

// Route imports
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const simulationRoutes = require('./routes/simulationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logger (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    if (!req.url.includes('/favicon')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });
}

// ─── Routes ────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/simulations', simulationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'POS Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  POS Order & Inventory System`);
      console.log(`  Server running on http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Reservation TTL: ${process.env.RESERVATION_TTL_SEC || 300}s`);
      console.log(`${'═'.repeat(50)}\n`);
    });

    // Start background expiration job
    const intervalSec = parseInt(process.env.EXPIRATION_JOB_INTERVAL_SEC) || 15;
    startExpirationJob(intervalSec);
  } catch (error) {
    console.error('[SERVER] Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
