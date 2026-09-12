import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import StatusBadge from '../components/StatusBadge';
import CountdownTimer from '../components/CountdownTimer';

const PaymentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [idempotencyKey] = useState(`PAY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.getOrder(orderId);
      setOrder(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (orderId) fetchOrder(); }, [orderId]);

  const handlePay = async (outcome) => {
    try {
      setProcessing(true);
      setError(null);
      setPaymentResult(null);
      const res = await api.processPayment({ orderId, idempotencyKey, simulateOutcome: outcome });
      setPaymentResult({ outcome, ...res.data });
      setOrder(res.data.order);

      if (res.data.payment?.status === 'SUCCESS') {
        showToast('🎉 Payment successful! Order is paid.', 'success');
      } else {
        showToast(`Payment ${outcome.toLowerCase()}. Stock has been released.`, 'danger');
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'danger');
      fetchOrder();
    } finally {
      setProcessing(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="page-body">
        <div className="center-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading payment page...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="page-body">
        <div className="card card-pad empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Order Not Found</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
          <Link to="/orders" className="btn btn-primary btn-sm">View All Orders</Link>
        </div>
      </div>
    );
  }

  const isReserved = order?.status === 'RESERVED';
  const isPaid = order?.status === 'PAID';

  return (
    <div className="page-body">
      {/* Steps */}
      <div className="steps">
        <div className="step done"><div className="step-circle">✓</div><span className="step-label">Cart</span></div>
        <div className="step-line" style={{ background: 'var(--primary)' }} />
        <div className="step done"><div className="step-circle">✓</div><span className="step-label">Review</span></div>
        <div className="step-line" style={{ background: isPaid ? 'var(--green)' : 'var(--primary)' }} />
        <div className={`step ${isPaid ? 'done' : 'active'}`}>
          <div className="step-circle">{isPaid ? '✓' : '3'}</div>
          <span className="step-label">Payment</span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Order Info */}
        <div className="card card-pad" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 className="page-title" style={{ fontSize: '1.2rem' }}>💳 Pay for Your Order</h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                {order?.orderId}
              </p>
            </div>
            <div style={{ display: 'flex', align: 'center', gap: '0.75rem', alignItems: 'center' }}>
              <StatusBadge status={order?.status} />
              {isReserved && (
                <CountdownTimer
                  expiresAt={order.reservationExpiresAt}
                  status={order.status}
                  onExpire={fetchOrder}
                />
              )}
            </div>
          </div>

          <hr className="divider" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Items</div>
              <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                {order?.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Amount Due</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                ${order?.totalAmount?.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">⚠️ {error}</div>}

        {/* Payment Result */}
        {paymentResult && (
          <div className={`result-card ${paymentResult.payment?.status === 'SUCCESS' ? 'success' : 'failure'}`} style={{ marginBottom: '1.25rem' }}>
            <div className="result-icon">
              {paymentResult.payment?.status === 'SUCCESS' ? '✅' : '❌'}
            </div>
            <div>
              <div className="result-title">
                {paymentResult.payment?.status === 'SUCCESS'
                  ? 'Payment Successful!'
                  : `Payment ${paymentResult.payment?.status}`}
              </div>
              <div className="result-text">
                {paymentResult.payment?.status === 'SUCCESS'
                  ? 'Your order has been confirmed. Stock is permanently reserved.'
                  : 'The payment did not go through. Stock has been released back.'}
              </div>
              {paymentResult.payment?.status === 'SUCCESS' && (
                <Link to="/orders" className="btn btn-success btn-sm" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
                  View My Orders →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Payment Actions */}
        <div className="card card-pad" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.35rem', fontSize: '0.95rem' }}>
            {isReserved ? '🧪 Simulate Payment' : '⚠️ Order Not Active'}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: '1.25rem' }}>
            {isReserved
              ? 'This is a test system — choose a payment outcome to simulate.'
              : `This order is in "${order?.status}" state and cannot accept new payments.`}
          </p>

          {isReserved && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <button
                onClick={() => handlePay('SUCCESS')}
                disabled={processing}
                className="outcome-btn outcome-success"
              >
                <span className="outcome-btn-icon">✅</span>
                <span className="outcome-btn-label">Success</span>
                <span className="outcome-btn-desc">Payment goes through</span>
              </button>

              <button
                onClick={() => handlePay('FAILURE')}
                disabled={processing}
                className="outcome-btn outcome-fail"
              >
                <span className="outcome-btn-icon">❌</span>
                <span className="outcome-btn-label">Declined</span>
                <span className="outcome-btn-desc">Card declined, stock released</span>
              </button>

              <button
                onClick={() => handlePay('TIMEOUT')}
                disabled={processing}
                className="outcome-btn outcome-timeout"
              >
                <span className="outcome-btn-icon">⏱️</span>
                <span className="outcome-btn-label">Timeout</span>
                <span className="outcome-btn-desc">Gateway timeout (3s delay)</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Link to="/orders" className="btn btn-secondary">← All Orders</Link>
          <Link to={`/orders/${order?.orderId}`} className="btn btn-outline">View Order Details</Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
