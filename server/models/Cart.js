const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    cartId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CHECKED_OUT', 'ABANDONED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast session lookups
cartSchema.index({ sessionId: 1, status: 1 });

module.exports = mongoose.model('Cart', cartSchema);
