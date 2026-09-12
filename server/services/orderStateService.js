/**
 * Order State Machine Service
 * Defines and enforces valid state transitions for order lifecycle.
 * Prevents illegal transitions (e.g., EXPIRED -> PAID).
 */

// Valid state transition map
const VALID_TRANSITIONS = {
  PENDING: ['RESERVED', 'FAILED'],
  RESERVED: ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
  PAID: ['CANCELLED'],
  CANCELLED: [],
  EXPIRED: [],
  FAILED: [],
};

// Terminal states that allow no further transitions
const TERMINAL_STATES = ['CANCELLED', 'EXPIRED', 'FAILED'];

/**
 * Check if a state transition is valid.
 * @param {string} currentStatus - Current order status
 * @param {string} targetStatus - Desired target status
 * @returns {boolean}
 */
const canTransition = (currentStatus, targetStatus) => {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
};

/**
 * Validate a transition and throw a descriptive error if invalid.
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @throws {Error} with statusCode 400 if transition is invalid
 */
const validateTransition = (currentStatus, targetStatus) => {
  if (!canTransition(currentStatus, targetStatus)) {
    const err = new Error(
      `Invalid state transition: ${currentStatus} -> ${targetStatus}. ` +
      `Allowed transitions from ${currentStatus}: [${(VALID_TRANSITIONS[currentStatus] || []).join(', ')}]`
    );
    err.statusCode = 400;
    throw err;
  }
};

/**
 * Check if an order is in a terminal state (no further transitions).
 * @param {string} status
 * @returns {boolean}
 */
const isTerminal = (status) => TERMINAL_STATES.includes(status);

/**
 * Check if an order can accept payment.
 * Only RESERVED orders can be paid.
 * @param {string} status
 * @returns {boolean}
 */
const canAcceptPayment = (status) => status === 'RESERVED';

/**
 * Check if an order's stock should be released upon this transition.
 * @param {string} targetStatus
 * @returns {boolean}
 */
const shouldReleaseStock = (targetStatus) =>
  ['FAILED', 'EXPIRED', 'CANCELLED'].includes(targetStatus);

module.exports = {
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  canTransition,
  validateTransition,
  isTerminal,
  canAcceptPayment,
  shouldReleaseStock,
};
