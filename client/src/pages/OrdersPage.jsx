import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import StatusBadge from '../components/StatusBadge';
import CountdownTimer from '../components/CountdownTimer';

const STATUS_LABELS = {
  ALL: 'All',
  RESERVED: '⏳ Reserved',
  PAID: '✅ Paid',
  CANCELLED: '🚫 Cancelled',
  EXPIRED: '⏰ Expired',
  FAILED: '❌ Failed',
  PENDING: '🕐 Pending',
};

const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilter = searchParams.get('status') || 'ALL';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const { showToast } = useCart();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = currentFilter !== 'ALL' ? { status: currentFilter } : {};
      const res = await api.getOrders(params);
      setOrders(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [currentFilter]);

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order? Stock will be released.')) return;
    try {
      setCancellingId(orderId);
      await api.cancelOrder(orderId);
      showToast('Order cancelled', 'info');
      await fetchOrders();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = orders.filter(
    (o) =>
      o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.sessionId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">📋 Orders</h1>
          <p className="page-subtitle">Track all your orders and their current status</p>
        </div>
        <button onClick={fetchOrders} className="btn btn-secondary btn-sm">🔄 Refresh</button>
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {/* Filters + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="filter-tabs">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`filter-tab ${currentFilter === key ? 'active' : ''}`}
              onClick={() => setSearchParams(key === 'ALL' ? {} : { status: key })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="center-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading orders...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card card-pad empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No orders found</h3>
          <p style={{ fontSize: '0.82rem' }}>
            {searchTerm ? 'No orders match your search.' : `No orders with status "${currentFilter}".`}
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Timer</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const isReserved = order.status === 'RESERVED';
                  const canCancel = ['PENDING', 'RESERVED'].includes(order.status);
                  const isCancelling = cancellingId === order.orderId;

                  return (
                    <tr key={order.orderId}>
                      <td>
                        <Link
                          to={`/orders/${order.orderId}`}
                          style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8rem', textDecoration: 'none' }}
                        >
                          {order.orderId}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>
                          {order.items?.map(i => `${i.name} ×${i.quantity}`).join(', ').substring(0, 40)}
                          {(order.items?.map(i => `${i.name} ×${i.quantity}`).join(', ') || '').length > 40 && '...'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>${order.totalAmount?.toFixed(2)}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>
                        {isReserved ? (
                          <CountdownTimer
                            expiresAt={order.reservationExpiresAt}
                            status={order.status}
                            onExpire={fetchOrders}
                          />
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {order.status === 'PAID' ? '—' : 'Closed'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {isReserved && (
                            <Link to={`/payment/${order.orderId}`} className="btn btn-primary btn-sm">
                              💳 Pay
                            </Link>
                          )}
                          <Link to={`/orders/${order.orderId}`} className="btn btn-secondary btn-sm">
                            Details
                          </Link>
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(order.orderId)}
                              disabled={isCancelling}
                              className="btn btn-danger btn-sm"
                            >
                              {isCancelling ? '...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
