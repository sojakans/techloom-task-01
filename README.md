# POS Order & Inventory System — Concurrency-Safe Order Processing
**Techloom.ai Software Engineer Intern Practical Assessment — Task 01**

A production-grade Point of Sale (POS) Order and Inventory System built with Node.js, Express, MongoDB (Mongoose), and React (Vite). The system guarantees **zero overselling** under high concurrent load, implements **atomic stock reservations** with an automated 5-minute background expiration worker, ensures **idempotent payments**, and enforces a strict **finite state machine** for order lifecycles.

---

## 1. System Architecture

```
                                    +----------------------------------------+
                                    |         React POS Frontend (Vite)      |
                                    |     (Glassmorphism POS UI & Concurrency|
                                    |            Evaluation Lab)             |
                                    +-------------------+--------------------+
                                                        |
                                                        | REST API (JSON)
                                                        v
+---------------------------------------------------------------------------------------------------+
| Express.js Server (Port 5000)                                                                     |
|                                                                                                   |
|  [ Routes ] ----> [ Middleware ] ----> [ Controllers ] ----> [ Services ] ----> [ Mongoose ]     |
|   /api/products    - Error Handler      - Product             - Inventory        - Product Model  |
|   /api/cart        - Request Validation - Cart                - Reservation      - Cart Model     |
|   /api/orders      - Sanitize input     - Order               - State Machine    - Order Model    |
|   /api/payments                         - Payment             - Payment Engine   - Payment Model  |
|   /api/simulations                      - Simulation                                              |
|                                                                                                   |
|  [ Background Jobs ]                                                                              |
|   - Order Expiration Cleanup Worker (Periodic Check every 15s)                                    |
+---------------------------------------------------+-----------------------------------------------+
                                                    |
                                                    | Mongoose Wire Protocol
                                                    v
                                    +----------------------------------------+
                                    |            MongoDB Database            |
                                    |   (Products, Carts, Orders, Payments)  |
                                    +----------------------------------------+
```

---

## 2. Directory Structure

```
task-01/
├── server/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & replica-set transaction detection
│   ├── controllers/
│   │   ├── productController.js  # CRUD & live stock status
│   │   ├── cartController.js     # Session-based cart management
│   │   ├── orderController.js    # Concurrency-safe checkout & cancellation
│   │   ├── paymentController.js  # Idempotent mock payment gateway
│   │   └── simulationController.js # Parallel stress-test execution & verification
│   ├── jobs/
│   │   └── expirationJob.js      # Background worker expiring unpaid 5-min reservations
│   ├── middleware/
│   │   ├── asyncHandler.js       # Express async route wrapper
│   │   └── errorHandler.js       # Global JSON error & validation handler
│   ├── models/
│   │   ├── Product.js            # Product schema with availableStock & reservedStock
│   │   ├── Cart.js               # Cart schema with session tracking
│   │   ├── Order.js              # Order schema with reservationExpiresAt & status enums
│   │   └── Payment.js            # Payment schema with unique idempotencyKey index
│   ├── routes/
│   │   ├── productRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── simulationRoutes.js
│   ├── seeds/
│   │   └── seed.js               # Standalone database seed script
│   ├── services/
│   │   ├── inventoryService.js   # Atomic stock reservation & rollback engine
│   │   ├── orderStateService.js  # Finite state machine validation logic
│   │   └── paymentService.js     # Idempotent payment processing logic
│   ├── tests/
│   │   └── concurrency.test.js   # 11-scenario automated concurrency test suite
│   ├── utils/
│   │   ├── generateId.js         # Unique ID generator (PROD-xxx, ORD-xxx, PAY-xxx)
│   │   └── responseHandler.js    # Uniform API response formatter
│   ├── .env                      # Environment config
│   ├── index.js                  # Express entry point
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js         # Unified REST API client with session management
│   │   ├── components/
│   │   │   ├── CountdownTimer.jsx # Live 5-minute reservation timer
│   │   │   ├── Navbar.jsx        # Navigation header with live health & session switch
│   │   │   ├── ProductModal.jsx  # Add/Edit product modal with validation
│   │   │   ├── StatusBadge.jsx   # Status indicator pills
│   │   │   ├── StockIndicator.jsx# Real-time stock status badge
│   │   │   └── Toast.jsx         # Floating notification banner
│   │   ├── context/
│   │   │   └── CartContext.jsx   # Shopping cart state provider
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx # Analytics, stock breakdown & order metrics
│   │   │   ├── ProductsPage.jsx  # POS catalog with quantity selectors
│   │   │   ├── ProductManagementPage.jsx # Admin inventory management table
│   │   │   ├── CartPage.jsx      # Shopping cart with line calculations
│   │   │   ├── CheckoutPage.jsx  # Order review & atomic stock reservation trigger
│   │   │   ├── PaymentPage.jsx   # Mock payment simulator (Success, Failure, Timeout)
│   │   │   ├── OrdersPage.jsx    # Orders list with status tabs & cancellation
│   │   │   ├── OrderDetailsPage.jsx # Detailed order timeline & state flowchart
│   │   │   └── StressTestPage.jsx # Live concurrency stress test laboratory
│   │   ├── index.css             # Glassmorphism dark POS styling
│   │   ├── App.jsx               # Route definitions
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 3. Database Models & Schema Design

### 3.1 Product (`Product.js`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `productId` | `String` (Unique, Indexed) | Human-readable identifier (e.g., `PROD-A819`) |
| `name` | `String` (Required) | Name of the product |
| `price` | `Number` (Required, Min: 0) | Unit price |
| `availableStock` | `Number` (Required, Min: 0) | Stock currently available for new checkouts |
| `reservedStock` | `Number` (Default: 0) | Stock currently locked in active 5-min reservations |
| `createdAt` / `updatedAt` | `Date` | Timestamp records |

### 3.2 Cart (`Cart.js`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `cartId` | `String` (Unique, Indexed) | Unique cart identifier (e.g., `CART-91B2`) |
| `sessionId` | `String` (Indexed) | Customer session identifier |
| `items` | `Array<CartItem>` | Array of `{ productId, name, price, quantity }` |
| `status` | `String` (Enum) | `ACTIVE`, `CHECKED_OUT`, `ABANDONED` |
| `createdAt` / `updatedAt` | `Date` | Timestamps |

### 3.3 Order (`Order.js`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `orderId` | `String` (Unique, Indexed) | Unique order reference (e.g., `ORD-8B31`) |
| `cartId` | `String` | Reference to checkout cart |
| `sessionId` | `String` | Session identifier |
| `items` | `Array<OrderItem>` | Snapshot of purchased products, quantities, and prices |
| `totalAmount` | `Number` | Verified total order amount in USD |
| `status` | `String` (Enum) | `PENDING`, `RESERVED`, `PAID`, `CANCELLED`, `EXPIRED`, `FAILED` |
| `paymentStatus` | `String` (Enum) | `UNPAID`, `PROCESSING`, `PAID`, `FAILED`, `REFUNDED` |
| `reservationExpiresAt` | `Date` (Indexed) | Timestamp when 5-minute stock hold expires |
| `createdAt` / `updatedAt` | `Date` | Timestamps |

### 3.4 Payment (`Payment.js`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `paymentId` | `String` (Unique, Indexed) | Payment transaction reference (e.g., `PAY-2C41`) |
| `orderId` | `String` (Indexed) | Target order reference |
| `amount` | `Number` | Amount processed |
| `status` | `String` (Enum) | `SUCCESS`, `FAILED`, `REJECTED` |
| `idempotencyKey` | `String` (Unique, Indexed) | Client key ensuring exactly-once payment processing |
| `paymentMethod` | `String` | Method descriptor (`SIMULATED_GATEWAY`) |
| `createdAt` | `Date` | Transaction timestamp |

---

## 4. Concurrency Strategy: Preventing Overselling

### The Problem
When 10 users simultaneously attempt to purchase a product with only 5 units in stock, naive "read-then-write" architectures (`if stock >= qty then update`) result in race conditions where all 10 requests read `stock = 5` before any write completes, causing **negative stock (-5)** and **overselling by 5 units**.

### The Solution: Atomic Preconditioned Queries (`$gte`)
We eliminate race conditions by leveraging MongoDB's atomic document-level write locks with a query precondition:

```javascript
const updatedProduct = await Product.findOneAndUpdate(
  {
    productId: item.productId,
    availableStock: { $gte: item.quantity } // Atomic Precondition
  },
  {
    $inc: {
      availableStock: -item.quantity,
      reservedStock: item.quantity
    }
  },
  { new: true }
);

if (!updatedProduct) {
  // Stock was unavailable at the exact microsecond of the write lock
  throw new Error(`Insufficient stock for product ${item.productId}`);
}
```

### Why this is 100% Concurrency-Safe:
1. **Single Micro-Operation**: MongoDB evaluates the query predicate `{ availableStock: { $gte: quantity } }` and applies the `$inc` update inside a single atomic operation.
2. **Zero Overselling**: If 10 requests arrive for 5 items, exactly 5 operations match and decrement stock down to 0. The remaining 5 requests fail the `$gte` condition and are immediately rejected with a `409 Conflict`.
3. **Multi-Item Rollback**: If a cart has multiple items and Item 2 fails stock check after Item 1 succeeded, the system immediately rolls back Item 1's reservation atomically.

---

## 5. 5-Minute Stock Reservation & Background Expiration Job

### Reservation Lifecycle
1. **Checkout**: When checkout is initiated, stock is moved from `availableStock` to `reservedStock`, and the order is set to `status: 'RESERVED'` with `reservationExpiresAt = now + 5 minutes`.
2. **Payment Success**: Order becomes `PAID`, and `reservedStock` is deducted (stock permanently purchased).
3. **Payment Failure / Cancel**: Stock is returned from `reservedStock` to `availableStock`, and order becomes `FAILED` or `CANCELLED`.
4. **Expiration Worker (`jobs/expirationJob.js`)**:
   - Runs every 15 seconds.
   - Idempotently queries for orders with `status: 'RESERVED'` and `reservationExpiresAt <= now`.
   - Uses an atomic query guard `findOneAndUpdate({ orderId, status: 'RESERVED' }, ...)` to guarantee an order is only expired once.
   - Releases stock back to `availableStock`.

---

## 6. Payment & Idempotency Strategy

1. **Unique Idempotency Key**: Every payment request accepts a client-generated `idempotencyKey`.
2. **Database-Level Constraint**: MongoDB enforces a `unique: true` index on `Payment.idempotencyKey`.
3. **Exactly-Once Execution**:
   - If an idempotency key already exists, the server immediately returns the cached payment record with `isDuplicate: true` without double-charging or modifying order state.
   - If an order is already `PAID`, `CANCELLED`, or `EXPIRED`, payment attempts are rejected with a `400 Bad Request`.
4. **Mock Payment Outcomes**:
   - **SUCCESS**: Order -> `PAID`, payment -> `SUCCESS`, stock retained.
   - **FAILURE**: Order -> `FAILED`, payment -> `FAILED`, stock released back.
   - **TIMEOUT**: Simulates gateway latency; if reservation expires during delay, payment is rejected and stock released.

---

## 7. Order Lifecycle State Machine

```
               +-------------+
               |   PENDING   |
               +------+------+
                      |
                      | (Atomic Stock Reservation)
                      v
               +-------------+
               |  RESERVED   | <----------------+
               +--+---+---+--+                  |
                  |   |   |                     |
        +---------+   |   +----------+          |
        |             |              |          |
        v             v              v          v
   (Payment      (5-Min Timer   (User Cancel  (Payment
    Success)       Expired)       / Admin)     Failure)
        |             |              |          |
        v             v              v          v
    +-------+    +---------+   +-----------+  +--------+
    | PAID  |    | EXPIRED |   | CANCELLED |  | FAILED |
    +---+---+    +---------+   +-----------+  +--------+
        |                            ^
        +----------------------------+
            (Admin Refund / Cancel)
```

### State Transition Validation Matrix
| From Status | Allowed Target Statuses | Forbidden Targets |
| :--- | :--- | :--- |
| `PENDING` | `RESERVED`, `FAILED` | `PAID`, `EXPIRED`, `CANCELLED` |
| `RESERVED` | `PAID`, `FAILED`, `EXPIRED`, `CANCELLED` | `PENDING` |
| `PAID` | `CANCELLED` (Refund) | `RESERVED`, `EXPIRED`, `FAILED`, `PENDING` |
| `CANCELLED` | *(Terminal)* None | `PAID`, `RESERVED`, etc. |
| `EXPIRED` | *(Terminal)* None | `PAID`, `RESERVED`, etc. |
| `FAILED` | *(Terminal)* None | `PAID`, `RESERVED`, etc. |

---

## 8. API Route Reference

### Products API
- `GET /api/products` — List all products with available and reserved stock.
- `GET /api/products/:id` — Get single product by ID.
- `POST /api/products` — Create new product (`{ name, price, availableStock }`).
- `PUT /api/products/:id` — Update product details.
- `DELETE /api/products/:id` — Delete product (safely blocked if active reservations exist).
- `GET /api/products/:id/stock` — Get real-time stock counters.
- `POST /api/products/seed` — Seed demo inventory.

### Cart API
- `GET /api/cart/:sessionId` — Get active cart for session.
- `POST /api/cart/items` — Add or update item quantity in cart.
- `DELETE /api/cart/items/:productId?sessionId=...` — Remove item from cart.
- `DELETE /api/cart/:sessionId` — Clear cart.

### Orders API
- `POST /api/orders/checkout` — Concurrency-safe checkout with atomic stock reservation.
- `GET /api/orders` — Get all orders with optional `?status=...` query filter.
- `GET /api/orders/:orderId` — Get order details, time remaining, and items.
- `POST /api/orders/:orderId/cancel` — Cancel order and release/restore stock.
- `GET /api/orders/stats` — Summary aggregation of orders and inventory metrics.

### Payments API
- `POST /api/payments` — Process payment idempotently (`{ orderId, idempotencyKey, simulateOutcome: 'SUCCESS'|'FAILURE'|'TIMEOUT' }`).

### Simulation API
- `POST /api/simulations/stress-test` — Run N concurrent checkout requests on limited stock.
- `POST /api/simulations/reset` — Reset orders, carts, and test data.

---

## 9. Setup & Installation Instructions

### Prerequisites
- **Node.js**: v18+ installed
- **MongoDB**: Running locally on `mongodb://127.0.0.1:27017` (or configured via `.env`)

### Step 1: Start Backend Server
```bash
cd task-01/server
npm install
npm run seed     # Optional: Seed sample catalog
npm start        # Starts server on http://localhost:5000
```

### Step 2: Start Frontend Application
```bash
cd task-01/client
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

### Step 3: Run Automated Concurrency & Integrity Test Suite
With the server running on port 5000:
```bash
cd task-01/server
npm test
```

---

## 10. Concurrency & Integrity Test Scenarios

The test suite (`server/tests/concurrency.test.js`) automatically validates 11 scenarios:
1. **Concurrent Checkout (10 requests, 5 stock)**: Exactly 5 succeed, 5 fail, stock reaches 0 and never goes negative.
2. **Last Item Race**: Two users simultaneously buy 1 remaining item; exactly 1 succeeds.
3. **Duplicate Payment (Idempotency)**: Identical key sent twice; only 1 transaction processed.
4. **Payment Success**: Stock confirmed and order marked PAID.
5. **Payment Failure**: Stock released back to available.
6. **Cancellation Before Payment**: Reserved stock released.
7. **Cancellation After Payment**: Paid stock restored to store.
8. **Attempt to Pay Expired Order**: Rejected by state guard.
9. **Attempt to Pay Cancelled Order**: Rejected by state guard.
10. **Invalid State Transitions**: Enforces valid transition matrix.
11. **High Concurrency Stress Test**: 25 parallel requests on 5 stock.
