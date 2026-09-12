const express = require('express');
const router = express.Router();
const {
  getCart,
  addItem,
  removeItem,
  clearCart,
} = require('../controllers/cartController');

router.get('/:sessionId', getCart);
router.post('/items', addItem);
router.delete('/items/:productId', removeItem);
router.delete('/:sessionId', clearCart);

module.exports = router;
