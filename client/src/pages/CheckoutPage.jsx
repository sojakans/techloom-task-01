import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart, totalPrice, sessionId, fetchCart, showToast } = useCart();

  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  // 5-Minute Timer Countdown State
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);

  // Payment Method Selector State
  const [paymentMethod, setPaymentMethod] = useState('CARD'); // 'CARD', 'CASH', 'SPLIT_QR'
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('384');
  const [cashTendered, setCashTendered] = useState('100.00');
  const [idempotencyKey] = useState(`PAY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);

  const items = cart?.items || [];
  const existingOrderId = searchParams.get('orderId');

  // Load existing order if orderId query param exists
  useEffect(() => {
    if (existingOrderId) {
      const loadOrder = async () => {
        try {
          setLoading(true);
          const res = await api.getOrder(existingOrderId);
          setActiveOrder(res.data);
          if (res.data.reservationExpiresAt) {
            const diff = Math.max(0, Math.floor((new Date(res.data.reservationExpiresAt) - new Date()) / 1000));
            setTimeLeft(diff);
            if (diff === 0) setIsExpired(true);
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      loadOrder();
    }
  }, [existingOrderId]);

  // Reservation Countdown Tick
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'RESERVED' || isExpired) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          showToast('5-minute reservation expired. Stock released back to catalog.', 'danger');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeOrder, isExpired]);

  // Lock stock & initialize 5-minute hold
  const handleLockStockAndReserve = async () => {
    if (!cart || items.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.checkout(cart.cartId, sessionId);
      setActiveOrder(res.data);
      setTimeLeft(300);
      setIsExpired(false);
      showToast(`Stock reserved! Hold ID: HLD-${res.data.orderId.slice(-6)} active for 300s`, 'success');
      await fetchCart();
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Payment Execution & Sandbox Triggers
  const handleExecutePayment = async (simulatedOutcome = 'SUCCESS') => {
    const targetOrderId = activeOrder?.orderId;
    if (!targetOrderId) return;

    try {
      setProcessing(true);
      setError(null);
      const res = await api.processPayment({
        orderId: targetOrderId,
        idempotencyKey,
        simulateOutcome: simulatedOutcome,
        paymentMethod,
      });

      setPaymentResult(res.data);
      setActiveOrder(res.data.order);

      if (res.data.payment?.status === 'SUCCESS') {
        showToast('Payment Settled! Inventory permanently committed.', 'success');
      } else if (res.data.payment?.status === 'FAILED') {
        showToast('Payment Failed! Reserved stock immediately rolled back.', 'danger');
      } else {
        showToast('Gateway Timeout! Reservation released back to ATS.', 'warning');
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'danger');
    } finally {
      setProcessing(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCritical = timeLeft < 60;
  const isPaid = activeOrder?.status === 'PAID';
  const isFailed = activeOrder?.status === 'FAILED' || activeOrder?.status === 'EXPIRED';

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
              TRANSACTION WORKFLOW
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Idempotency: {idempotencyKey}</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            Checkout — Stock Reservation & Payment
          </h1>
        </div>
        <Link to="/terminal" className="btn btn-secondary btn-sm">
          ← Return to Terminal
        </Link>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

      {/* When no order is reserved yet */}
      {!activeOrder && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card card-pad">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Review Items Before Hold</h3>
            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🛒</div>
                <h3>Your register cart is empty</h3>
                <Link to="/terminal" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                  Open POS Terminal
                </Link>
              </div>
            ) : (
              <div>
                <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.productId}>
                          <td style={{ fontWeight: 600 }}>{it.name}</td>
                          <td>×{it.quantity}</td>
                          <td>${it.price?.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>${(it.price * it.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
                    <span>Total Due:</span>
                    <span style={{ color: '#4f63ff' }}>${totalPrice?.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleLockStockAndReserve}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontWeight: 800, fontSize: '1rem', justifyContent: 'center' }}
                >
                  {loading ? 'Locking Inventory...' : '🔒 Reserve Stock & Start 5-Minute Checkout Hold'}
                </button>
              </div>
            )}
          </div>

          <div className="card card-pad" style={{ background: '#f8fafc' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>🛡️ The 5-Minute Stock Invariant Guarantee</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: '1rem' }}>
              Once you click "Reserve Stock", NexusPOS performs an atomic check against MongoDB. It moves the required units from <strong>Available to Sell (ATS)</strong> into <strong>Reserved Stock</strong> with an exact 300-second TTL.
            </p>
            <ul style={{ fontSize: '0.8rem', color: 'var(--gray-700)', paddingLeft: '1.25rem', lineHeight: '1.8' }}>
              <li><strong>Zero Overselling:</strong> Other cashiers or web shoppers cannot claim your items while timer runs.</li>
              <li><strong>Automatic Cleanup:</strong> If payment is not finalized in 300s, background cron automatically reverts stock.</li>
              <li><strong>Idempotent Gateway:</strong> Double-clicking payment will never charge a customer twice.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Active Order with Urgent 5-Minute Reservation Hold */}
      {activeOrder && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Urgent Timer & Payment Inputs */}
          <div>
            {/* Urgent 5-Minute Reservation Card */}
            {!isPaid && !isFailed && (
              <div className="urgent-timer-box" style={{ borderLeft: isCritical ? '6px solid #ef4444' : '6px solid #f59e0b' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                    Active 5-Minute Stock Hold
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff', marginTop: '0.2rem' }}>
                    Hold ID: <span style={{ fontFamily: 'monospace', color: '#818cf8' }}>HLD-{activeOrder.orderId?.slice(-6)}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {isCritical ? '⚠️ Less than 60 seconds remaining!' : 'Stock guaranteed against competing checkouts.'}
                  </div>
                </div>

                <div className={`urgent-timer-clock ${isCritical ? 'critical' : ''}`}>
                  <span>⏱️</span>
                  <span>{formatTimer(timeLeft)}</span>
                </div>
              </div>
            )}

            {/* Payment Outcome Result Banner if settled/failed */}
            {isPaid && (
              <div className="alert alert-success" style={{ marginBottom: '1.25rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Payment Successfully Settled!</div>
                  <div style={{ fontSize: '0.85rem' }}>Invoice generated and inventory deducted permanently from shelf stock.</div>
                </div>
              </div>
            )}

            {isFailed && (
              <div className="alert alert-danger" style={{ marginBottom: '1.25rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>❌</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Order Expired or Payment Failed</div>
                  <div style={{ fontSize: '0.85rem' }}>Reserved units have been released back to Available to Sell (ATS).</div>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="card card-pad" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Select Payment Method</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {[
                  { id: 'CARD', label: 'Credit Card', icon: '💳' },
                  { id: 'CASH', label: 'Cash Drawer', icon: '💵' },
                  { id: 'SPLIT_QR', label: 'Split / QR', icon: '📱' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`btn ${paymentMethod === pm.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ padding: '0.65rem 0.5rem', flexDirection: 'column', gap: '0.25rem', fontWeight: 700 }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{pm.icon}</span>
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>

              {/* Formatted Card Inputs */}
              {paymentMethod === 'CARD' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: 600, fontSize: '0.78rem' }}>Cardholder Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="input-label" style={{ fontWeight: 600, fontSize: '0.78rem' }}>Expiration (MM/YY)</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontWeight: 600, fontSize: '0.78rem' }}>Security Code (CVC)</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    <span>🔒</span>
                    <span>PCI-DSS Level 1 Encrypted Terminal Connection</span>
                  </div>
                </div>
              )}

              {/* Cash Inputs */}
              {paymentMethod === 'CASH' && (
                <div>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.78rem' }}>Cash Tendered ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                  />
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                    Change Due: ${(Math.max(0, parseFloat(cashTendered || 0) - (activeOrder.totalAmount || 0))).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Split QR */}
              {paymentMethod === 'SPLIT_QR' && (
                <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📱</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Scan QR on Customer Phone</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Supports Apple Pay, Google Pay, and UPI</div>
                </div>
              )}

              <button
                onClick={() => handleExecutePayment('SUCCESS')}
                disabled={processing || isPaid || isFailed || isExpired}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.25rem', padding: '0.85rem', fontWeight: 800, fontSize: '1rem', justifyContent: 'center' }}
              >
                {processing ? 'Authorizing...' : isPaid ? 'Order Paid ✓' : `Authorize & Settle ($${activeOrder.totalAmount?.toFixed(2)})`}
              </button>
            </div>
          </div>

          {/* Right Column: Developer Testing Sandbox & Order Summary */}
          <div>
            {/* Developer Testing Sandbox */}
            <div className="card card-pad" style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🛠️ Developer Testing Sandbox
                </span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 700 }}>
                  SIMULATOR
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '1rem' }}>
                Simulate backend HTTP outcome states to verify order lifecycle and atomic stock rollback handling in real time.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button
                  onClick={() => handleExecutePayment('SUCCESS')}
                  disabled={processing || isPaid}
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: 8,
                    color: '#4ade80',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>✓ Simulate Success</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>HTTP 200 OK</span>
                </button>

                <button
                  onClick={() => handleExecutePayment('FAILURE')}
                  disabled={processing || isPaid}
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 8,
                    color: '#f87171',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>✕ Simulate Card Decline</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>HTTP 402 Decline</span>
                </button>

                <button
                  onClick={() => handleExecutePayment('TIMEOUT')}
                  disabled={processing || isPaid}
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: 8,
                    color: '#fbbf24',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>⏳ Simulate Gateway Timeout</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>HTTP 408 Timeout</span>
                </button>
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Order Details</span>
                <StatusBadge status={activeOrder.status} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginBottom: '0.75rem', fontFamily: 'monospace' }}>
                Order #{activeOrder.orderId}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {activeOrder.items?.map((it) => (
                  <div key={it.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span>{it.name} <span style={{ color: 'var(--text-muted)' }}>×{it.quantity}</span></span>
                    <strong>${(it.price * it.quantity).toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total Amount:</span>
                <span style={{ color: '#4f63ff' }}>${activeOrder.totalAmount?.toFixed(2)}</span>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <Link to={`/orders/${activeOrder.orderId}`} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  View Full State Machine Lifecycle →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
