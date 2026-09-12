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

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order? Stock will be released.')) return;
    try {
      setCancelling(true);
      const res = await api.cancelOrder(orderId);
      setOrder(res.data);
      showToast('Order cancelled', 'info');
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
          <p>Loading order...</p>
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
  const canCancel = ['PENDING', 'RESERVED'].includes(order?.status);

  const steps = ['PENDING', 'RESERVED', 'PAID'];
  const currentIdx = steps.indexOf(order?.status);

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title">Order Details</h1>
            <StatusBadge status={order?.status} />
            {isReserved && (
              <CountdownTimer
                expiresAt={order?.reservationExpiresAt}
                status={order?.status}
                onExpire={fetchOrder}
              />
            )}
          </div>
          <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {order?.orderId}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isReserved && (
            <Link to={`/payment/${order?.orderId}`} className="btn btn-primary btn-sm">
              💳 Pay Now
            </Link>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling} className="btn btn-danger btn-sm">
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {/* Order Progress */}
      <div className="card card-pad" style={{ marginBottom: '1.25rem' }}>
        <div className="section-title" style={{ marginBottom: '1rem' }}>Order Progress</div>
        <div className="steps" style={{ marginBottom: 0 }}>
          {steps.map((step, i) => {
            const isDone = currentIdx > i || (order?.status === 'PAID' && i <= 2);
            const isActive = order?.status === step;
            const isTerminal = ['CANCELLED', 'EXPIRED', 'FAILED'].includes(order?.status);
            return (
              <React.Fragment key={step}>
                <div className={`step ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                  <div className="step-circle">{isDone && !isActive ? '✓' : i + 1}</div>
                  <span className="step-label">{step}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="step-line" style={{ background: isDone ? 'var(--green)' : 'var(--border)' }} />
                )}
              </React.Fragment>
            );
          })}
          {['CANCELLED', 'EXPIRED', 'FAILED'].includes(order?.status) && (
            <>
              <div className="step-line" />
              <div className="step">
                <div className="step-circle" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }}>✕</div>
                <span className="step-label" style={{ color: 'var(--red)' }}>{order?.status}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Items */}
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: '0.85rem' }}>Items Ordered</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order?.items?.map((item) => (
                  <tr key={item.productId}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>×{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-soft)' }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary)' }}>
              ${order?.totalAmount?.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: '0.85rem' }}>Order Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Order ID', value: order?.orderId, mono: true },
              { label: 'Created', value: new Date(order?.createdAt).toLocaleString() },
              { label: 'Payment Status', value: <StatusBadge status={order?.paymentStatus} /> },
              { label: 'Reservation Expires', value: order?.reservationExpiresAt ? new Date(order?.reservationExpiresAt).toLocaleTimeString() : 'N/A' },
              { label: 'Last Updated', value: new Date(order?.updatedAt).toLocaleString() },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-soft)', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontWeight: 500, fontFamily: row.mono ? 'monospace' : undefined, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
        <Link to="/orders" className="btn btn-secondary">← All Orders</Link>
        {isReserved && (
          <Link to={`/payment/${order?.orderId}`} className="btn btn-primary">
            💳 Pay This Order →
          </Link>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;
