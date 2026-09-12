import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CartPage = () => {
  const { cart, loading, error, totalPrice, totalItems, addToCart, removeFromCart, clearCart } = useCart();
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();

  const handleQty = async (productId, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      handleRemove(productId);
      return;
    }
    try {
      setUpdatingId(productId);
      await addToCart(productId, newQty);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (productId) => {
    try {
      setUpdatingId(productId);
      await removeFromCart(productId);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && (!cart || !cart.items)) {
    return (
      <div className="page-body">
        <div className="center-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading your cart...</p>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛒 Shopping Cart</h1>
          <p className="page-subtitle">Review items before checkout</p>
        </div>
        {items.length > 0 && (
          <button onClick={clearCart} className="btn btn-secondary btn-sm" style={{ color: 'var(--red)' }}>
            🗑️ Clear Cart
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {items.length === 0 ? (
        <div className="card card-pad empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>Go browse products and add items to your cart.</p>
          <Link to="/products" className="btn btn-primary">
            🛍️ Browse Products
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {/* Cart Items */}
          <div className="card">
            {items.map((item) => {
              const isUpdating = updatingId === item.productId;
              return (
                <div key={item.productId} className="cart-item">
                  {/* Icon */}
                  <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🛍️</div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">${item.price.toFixed(2)} each</div>
                  </div>
                  {/* Qty controls */}
                  <div className="qty-control">
                    <button
                      className="qty-btn"
                      onClick={() => handleQty(item.productId, item.quantity, -1)}
                      disabled={isUpdating}
                    >−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => handleQty(item.productId, item.quantity, 1)}
                      disabled={isUpdating}
                    >+</button>
                  </div>
                  {/* Subtotal */}
                  <div style={{ minWidth: '60px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item.productId)}
                    disabled={isUpdating}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '1.1rem', padding: '0.2rem', flexShrink: 0 }}
                    title="Remove"
                  >✕</button>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="summary-box">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Order Summary</h3>

            <div className="summary-row">
              <span>Items ({totalItems})</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Reservation hold</span>
              <span style={{ color: 'var(--blue)', fontWeight: 600 }}>5 minutes</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span className="summary-total-price">${totalPrice.toFixed(2)}</span>
            </div>

            <div className="info-banner" style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
              <span className="info-banner-icon">🔒</span>
              <span>When you checkout, we'll hold your items for <strong>5 minutes</strong> while you pay. After that, they go back to stock.</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary btn-full btn-lg"
            >
              Proceed to Checkout →
            </button>
            <Link
              to="/products"
              className="btn btn-secondary btn-full"
              style={{ marginTop: '0.6rem' }}
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
