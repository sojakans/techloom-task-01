import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

// Pages
import DashboardPage from './pages/DashboardPage';
import POSTerminalPage from './pages/POSTerminalPage';
import ProductCatalogPage from './pages/ProductCatalogPage';
import InventoryMonitorPage from './pages/InventoryMonitorPage';
import ReservationsPage from './pages/ReservationsPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentPage from './pages/PaymentPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import PaymentStatesPage from './pages/PaymentStatesPage';
import StressTestPage from './pages/StressTestPage';

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            <Routes>
              {/* Telemetry & Dashboard */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryMonitorPage />} />
              <Route path="/reservations" element={<ReservationsPage />} />

              {/* POS Operations */}
              <Route path="/terminal" element={<POSTerminalPage />} />
              <Route path="/products" element={<POSTerminalPage />} />
              <Route path="/catalog" element={<ProductCatalogPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetailsPage />} />

              {/* Checkout & Stock Holds */}
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment/:orderId" element={<PaymentPage />} />

              {/* Architecture & Simulation */}
              <Route path="/payment-states" element={<PaymentStatesPage />} />
              <Route path="/simulation" element={<StressTestPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Toast />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
