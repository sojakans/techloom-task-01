const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [1, 'Product name cannot be empty'],
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    availableStock: {
      type: Number,
      required: [true, 'Available stock is required'],
      min: [0, 'Available stock cannot be negative'],
      default: 0,
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total stock (available + reserved)
productSchema.virtual('totalStock').get(function () {
  return this.availableStock + this.reservedStock;
});

// Index for atomic stock operations
productSchema.index({ productId: 1, availableStock: 1 });

module.exports = mongoose.model('Product', productSchema);
