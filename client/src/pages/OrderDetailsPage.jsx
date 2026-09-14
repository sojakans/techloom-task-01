import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import StatusBadge from '../components/StatusBadge';
import CountdownTimer from '../components/CountdownTimer';

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const { showToast } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 8000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleConfirmCancel = async () => {
    try {
      setCancelling(true);
      const res = await api.cancelOrder(orderId);
      setOrder(res.data);
      showToast('Order cancelled. All reserved stock released back to ATS.', 'info');
      setIsCancelModalOpen(false);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="page-body">
        <div className="center-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading order lifecycle telemetry...</p>
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
          <Link to="/orders" className="btn btn-primary btn-sm">← Back to Orders</Link>
        </div>
      </div>
    );
  }

  const isReserved = order?.status === 'RESERVED';
  const isPaid = order?.status === 'PAID';
  const isCancelled = order?.status === 'CANCELLED';
  const isExpired = order?.status === 'EXPIRED';
  const isFailed = order?.status === 'FAILED';
  const canCancel = ['PENDING', 'RESERVED'].includes(order?.status);

  // State Machine Node Calculation
  // Standard happy path: Created -> Reserved -> Payment Started -> Settled -> Confirmed & Locked
  const fsmSteps = [
    { id: 'CREATED', label: 'Order Created' },
    { id: 'RESERVED', label: 'Stock Reserved (300s)' },
    { id: 'STARTED', label: 'Payment Started' },
    { id: 'SETTLED', label: 'Payment Settled' },
    { id: 'CONFIRMED', label: 'Confirmed & Locked' },
  ];

  const getStepStatus = (stepId) => {
    if (isCancelled || isExpired || isFailed) {
      if (stepId === 'CREATED') return 'completed';
      if (stepId === 'RESERVED') return 'completed';
      return 'failed';
    }
    if (isPaid) {
      return 'completed';
    }
    if (isReserved) {
      if (stepId === 'CREATED') return 'completed';
      if (stepId === 'RESERVED') return 'active';
      return 'pending';
    }
    if (order?.status === 'PENDING') {
      if (stepId === 'CREATED') return 'active';
      return 'pending';
    }
    return 'pending';
  };

  const totalReservedUnits = order?.items ? order.items.reduce((sum, it) => sum + it.quantity, 0) : 0;

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
              ORDER LIFECYCLE LEDGER
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Session: {order.sessionId?.substring(0, 10)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
              Order #{order.orderId}
            </h1>
            <StatusBadge status={order.status} />
            {isReserved && (
              <CountdownTimer
                expiresAt={order.reservationExpiresAt}
                status={order.status}
                onExpire={fetchOrder}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isReserved && (
            <Link to={`/checkout?orderId=${order.orderId}`} className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
              💳 Complete Payment →
            </Link>
          )}
          {canCancel && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="btn btn-outline btn-sm"
              style={{ color: '#dc2626', borderColor: '#fca5a5', fontWeight: 600 }}
            >
              Cancel Order
            </button>
          )}
          <Link to="/orders" className="btn btn-secondary btn-sm">
            ← Orders Ledger
          </Link>
        </div>
      </div>

      {/* Order State Machine Visualization */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="section-title" style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🔄 Finite State Machine (FSM) Lifecycle
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
              Deterministic transition sequence with atomic stock boundary locks
            </div>
          </div>
          {isCancelled && <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>BRANCH: ORDER CANCELLED (STOCK RESTORED)</span>}
          {isExpired && <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>BRANCH: 300s TIMEOUT (STOCK PURGED)</span>}
          {isPaid && <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>BRANCH: SETTLED & ARCHIVED</span>}
        </div>

        <div className="state-machine-track">
          {fsmSteps.map((step, idx) => {
            const status = getStepStatus(step.id);
            const isLast = idx === fsmSteps.length - 1;

            return (
              <React.Fragment key={step.id}>
                <div className={`state-node ${status}`}>
                  <div className="state-dot">
                    {status === 'completed' ? '✓' : status === 'failed' ? '✕' : idx + 1}
                  </div>
                  <div className="state-label" style={{ color: status === 'active' ? '#4f63ff' : status === 'completed' ? '#16a34a' : status === 'failed' ? '#dc2626' : '#64748b' }}>
                    {step.label}
                  </div>
                </div>
                {!isLast && (
                  <div className={`state-connector ${status === 'completed' ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Grid: Order Items & Financials / Audit Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Items & Financial Breakdown */}
        <div className="card card-pad">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Stock Hold Allocation</h3>
          <div className="table-wrap" style={{ marginBottom: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Units</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((it) => (
                  <tr key={it.productId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b' }}>{it.productId}</div>
                    </td>
                    <td>${it.price?.toFixed(2)}</td>
                    <td><strong>{it.quantity}</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      ${(it.price * it.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--text-soft)' }}>
              <span>Total Units Locked:</span>
              <strong>{totalReservedUnits} units</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
              <span>Total Amount:</span>
              <span style={{ color: '#4f63ff' }}>${order.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Audit Timeline & Customer Record */}
        <div className="card card-pad">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Audit Timeline & Ledger Events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4f63ff', marginTop: '0.35rem' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Order Created & Initialized</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Just now'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                  Session {order.sessionId} initiated cart checkout.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: isPaid ? '#22c55e' : isCancelled || isExpired ? '#ef4444' : '#f59e0b', marginTop: '0.35rem' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  {isPaid ? 'Payment Confirmed & Stock Deducted' : isCancelled ? 'Manual Cancellation (Stock Restored)' : isExpired ? '300s Expiration Triggered' : '5-Minute Reservation Active'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                  TTL: 300s from creation
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                  {isPaid
                    ? 'Payment ID logged. Stock converted from reserved to permanent sale.'
                    : isCancelled
                    ? `Staff triggered cancellation. ${totalReservedUnits} units returned to ATS.`
                    : isExpired
                    ? 'Background cron purged lock. Inventory returned to catalog.'
                    : 'Inventory protected against concurrent checkouts.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="slide-over-backdrop" onClick={() => setIsCancelModalOpen(false)}>
          <div
            className="slide-over-panel"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: '#fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  ⚠️ Confirm Order Cancellation
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                  Irreversible stock rollback operation
                </div>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#991b1b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '1rem', color: '#9f1239', fontSize: '0.85rem', lineHeight: '1.6' }}>
                <strong>Warning to Staff:</strong>
                <p style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  Cancelling Order <strong>#{order.orderId}</strong> will immediately:
                </p>
                <ul style={{ paddingLeft: '1.25rem' }}>
                  <li>Release <strong>{totalReservedUnits} units</strong> back into <strong>Available to Sell (ATS)</strong>.</li>
                  <li>Void the 5-minute stock reservation lock across all registers.</li>
                  <li>Log an irreversible cancellation entry in the audit ledger.</li>
                </ul>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Keep Order Active
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', background: '#dc2626', borderColor: '#b91c1c', fontWeight: 700 }}
                >
                  {cancelling ? 'Releasing Stock...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
