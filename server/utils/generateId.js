const { v4: uuidv4 } = require('uuid');

/**
 * Generate prefixed unique IDs for different entity types.
 */
const generateId = {
  product: () => `PROD-${uuidv4().split('-')[0].toUpperCase()}`,
  cart: () => `CART-${uuidv4().split('-')[0].toUpperCase()}`,
  order: () => `ORD-${uuidv4().split('-')[0].toUpperCase()}`,
  payment: () => `PAY-${uuidv4().split('-')[0].toUpperCase()}`,
  session: () => `SES-${uuidv4().split('-')[0].toUpperCase()}`,
};

module.exports = generateId;
