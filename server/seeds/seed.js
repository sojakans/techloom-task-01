require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('../config/db');
const Product = require('../models/Product');
const generateId = require('../utils/generateId');

const seedProducts = [
  { name: 'Ergonomic Mechanical Keyboard', price: 129.99, availableStock: 25 },
  { name: 'Wireless Precision Mouse', price: 59.99, availableStock: 30 },
  { name: 'USB-C Dual 4K Docking Station', price: 189.99, availableStock: 15 },
  { name: 'Noise-Cancelling Studio Headphones', price: 249.99, availableStock: 10 },
  { name: 'Ultra-Wide Curved Monitor 34"', price: 499.99, availableStock: 8 },
  { name: 'Adjustable Aluminum Laptop Stand', price: 45.00, availableStock: 40 },
  { name: 'High-Speed NVMe SSD 2TB', price: 159.99, availableStock: 20 },
  { name: 'Smart LED Desk Lamp with Wireless Charging', price: 79.99, availableStock: 18 },
];

async function seed() {
  try {
    await connectDB();
    console.log('[SEED] Connected to database');

    for (const item of seedProducts) {
      const existing = await Product.findOne({ name: item.name });
      if (!existing) {
        const prod = await Product.create({
          productId: generateId.product(),
          ...item,
          reservedStock: 0,
        });
        console.log(`  + Created: ${prod.productId} — "${prod.name}" ($${prod.price}, stock: ${prod.availableStock})`);
      } else {
        console.log(`  • Exists: ${existing.productId} — "${existing.name}"`);
      }
    }

    console.log('[SEED] Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err.message);
    process.exit(1);
  }
}

seed();
