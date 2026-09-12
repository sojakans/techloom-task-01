import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api/client';

const CheckoutPage = () => {
  const { cart, totalPrice, sessionId, fetchCart, showToast } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const items = cart?.items || [];

  const handleCheckout = async () => {
    if (!cart || items.length === 0) {
      showToast('Your cart is empty', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.checkout(cart.cartId, sessionId);
      showToast('Order placed! Stock reserved for 5 minutes.', 'success');
      await fetchCart();
      navigate(`/payment/${res.data.orderId}`);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page-body">
        <div className="card card-pad empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Nothing to checkout</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>Add items to your cart first.</p>
          <Link to="/products" className="btn btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      {/* Steps */}
      <div className="steps">
        <div className="step done">
          <div className="step-circle">✓</div>
          <span className="step-label">Cart</span>
        </div>
        <div className="step-line" style={{ background: 'var(--primary)' }} />
        <div className="step active">
          <div className="step-circle">2</div>
          <span className="step-label">Review</span>
        </div>
        <div className="step-line" />
        <div className="step">
          <div className="step-circle">3</div>
          <span className="step-label">Payment</span>
        </div>
      </div>

      <div className="page-header">
        <h1 className="page-title">Review Your Order</h1>
        <p className="page-subtitle">Make sure everything looks correct before placing the order</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          ❌ <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {/* Item List */}
        <div className="card card-pad">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Items in Order</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td><strong>×{item.quantity}</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary + Confirm */}
        <div className="summary-box">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Order Summary</h3>

          <div className="summary-row">
            <span>{items.length} product type{items.length > 1 ? 's' : ''}</span>
            <span>{items.reduce((s, i) => s + i.quantity, 0)} items</span>
          </div>
          <div className="summary-row total">
            <span>Total to Pay</span>
            <span className="summary-total-price">${totalPrice.toFixed(2)}</span>
          </div>

          <div className="info-banner" style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
            <span className="info-banner-icon">⏳</span>
            <div>
              <strong>What happens next?</strong>
              <br />
              We'll hold your items for <strong>5 minutes</strong> while you pay. No one else can buy them during this time.
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={submitting}
            className="btn btn-primary btn-full btn-lg"
          >
            {submitting ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Placing Order...</>
            ) : (
              '🔒 Place Order & Pay →'
            )}
          </button>

          <Link to="/cart" className="btn btn-secondary btn-full" style={{ marginTop: '0.6rem' }}>
            ← Back to Cart
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
