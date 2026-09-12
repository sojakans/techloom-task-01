const express = require('express');
const router = express.Router();
const {
  checkout,
  getOrders,
  getOrder,
  cancelOrder,
  getOrderStats,
} = require('../controllers/orderController');

router.post('/checkout', checkout);
router.get('/stats', getOrderStats);
router.get('/', getOrders);
router.get('/:orderId', getOrder);
router.post('/:orderId/cancel', cancelOrder);

module.exports = router;
