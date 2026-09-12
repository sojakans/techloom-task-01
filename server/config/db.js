const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS resolvers ONLY on local Windows (prevent ISP SRV lookup failures)
// In cloud / Vercel Lambda environments, default VPC resolver must be used
if (process.platform === 'win32' && !process.env.VERCEL) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    if (dns.setDefaultResultOrder) {
      dns.setDefaultResultOrder('ipv4first');
    }
  } catch (e) {
    // Ignore if not permitted
  }
}

let cachedConn = null;

/**
 * Connect to MongoDB.
 * Reuses active connection in serverless / lambda environments (Vercel).
 */
const connectDB = async () => {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  const defaultUri = 'mongodb+srv://sojakanjakan_db_user:lFFWRTapjh1Xk2Zb@cluster0.gtwrmt4.mongodb.net/pos_system?retryWrites=true&w=majority';
  const mongoUri = process.env.MONGO_URI || defaultUri;

  try {
    console.log(`[DB] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}...`);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false,
    });
    console.log(`[DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    cachedConn = conn;

    // Check if replica set is available for transaction support
    try {
      const admin = conn.connection.db.admin();
      const info = await admin.replSetGetStatus();
      console.log(`[DB] Replica set detected: ${info.set}. Transactions enabled.`);
      global.__TRANSACTIONS_SUPPORTED = true;
    } catch {
      console.log('[DB] MongoDB connected. Using atomic operations.');
      global.__TRANSACTIONS_SUPPORTED = false;
    }

    await autoSeedIfEmpty();
    return conn;
  } catch (error) {
    if (process.env.VERCEL) {
      console.error(`[DB] MongoDB Atlas connection failed on Vercel: ${error.message}`);
      throw error;
    }

    console.warn(`[DB] MongoDB connection failed (${error.message}).`);
    console.log('[DB] Starting embedded In-Memory MongoDB server for zero-config execution...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();

      const conn = await mongoose.connect(memoryUri);
      console.log(`[DB] Embedded MongoDB active at: ${memoryUri}`);
      global.__TRANSACTIONS_SUPPORTED = true;
      cachedConn = conn;

      await autoSeedIfEmpty();
      return conn;
    } catch (memError) {
      console.error(`[DB] Failed to start embedded MongoDB: ${memError.message}`);
      process.exit(1);
    }
  }
};

/**
 * Auto-seed initial catalog products if database is empty.
 */
const autoSeedIfEmpty = async () => {
  try {
    const Product = require('../models/Product');
    const generateId = require('../utils/generateId');

    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('[DB] Database is empty — automatically seeding initial product catalog...');
      const defaultProducts = [
        { name: 'Ergonomic Mechanical Keyboard', price: 129.99, availableStock: 25 },
        { name: 'Wireless Precision Mouse', price: 59.99, availableStock: 30 },
        { name: 'USB-C Dual 4K Docking Station', price: 189.99, availableStock: 15 },
        { name: 'Noise-Cancelling Studio Headphones', price: 249.99, availableStock: 10 },
        { name: 'Ultra-Wide Curved Monitor 34"', price: 499.99, availableStock: 8 },
        { name: 'Adjustable Aluminum Laptop Stand', price: 45.00, availableStock: 40 },
        { name: 'High-Speed NVMe SSD 2TB', price: 159.99, availableStock: 20 },
        { name: 'Smart LED Desk Lamp with Wireless Charging', price: 79.99, availableStock: 18 },
      ];

      for (const p of defaultProducts) {
        await Product.create({
          productId: generateId.product(),
          ...p,
          reservedStock: 0,
        });
      }
      console.log(`[DB] Successfully seeded ${defaultProducts.length} default products.`);
    }
  } catch (err) {
    console.warn(`[DB] Auto-seed note: ${err.message}`);
  }
};

module.exports = connectDB;
