const mongoose = require('mongoose');

const PAYMENT_RESULT_STATUSES = ['SUCCESS', 'FAILED', 'REJECTED'];

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: PAYMENT_RESULT_STATUSES,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      unique: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'SIMULATED_GATEWAY',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

paymentSchema.statics.PAYMENT_RESULT_STATUSES = PAYMENT_RESULT_STATUSES;

module.exports = mongoose.model('Payment', paymentSchema);
