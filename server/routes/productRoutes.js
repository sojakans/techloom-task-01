const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStock,
  seedProducts,
} = require('../controllers/productController');

router.get('/', getProducts);
router.post('/', createProduct);
router.post('/seed', seedProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.get('/:id/stock', getProductStock);

module.exports = router;
