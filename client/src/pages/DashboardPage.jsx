import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, ordersRes] = await Promise.all([
        api.getOrderStats(),
        api.getOrders(),
      ]);
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.slice(0, 5));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="page-body">
        <div className="center-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { orders = {}, products = {} } = stats || {};

  const statCards = [
    {
      label: 'Products',
      value: products.totalProducts || 0,
      sub: `${products.totalAvailableStock || 0} items in stock`,
      icon: '📦',
      bg: '#eef0ff',
      link: '/inventory',
    },
    {
      label: 'Active Orders',
      value: (orders.reserved || 0) + (orders.pending || 0),
      sub: `${orders.reserved || 0} with timer running`,
      icon: '⏳',
      bg: '#dbeafe',
      link: '/orders?status=RESERVED',
    },
    {
      label: 'Paid Orders',
      value: orders.paid || 0,
      sub: `$${(orders.totalRevenue || 0).toFixed(2)} total revenue`,
      icon: '✅',
      bg: '#dcfce7',
      link: '/orders?status=PAID',
    },
    {
      label: 'Expired Orders',
      value: orders.expired || 0,
      sub: 'Auto-released by system',
      icon: '⏰',
      bg: '#fef3c7',
      link: '/orders?status=EXPIRED',
    },
    {
      label: 'Cancelled',
      value: orders.cancelled || 0,
      sub: 'Manually cancelled',
      icon: '🚫',
      bg: '#f1f5f9',
      link: '/orders?status=CANCELLED',
    },
    {
      label: 'Failed Orders',
      value: orders.failed || 0,
      sub: 'Payment declined',
      icon: '❌',
      bg: '#fee2e2',
      link: '/orders?status=FAILED',
    },
  ];

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Good day! 👋</h1>
          <p className="page-subtitle">Here's what's happening in your store right now.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchData} className="btn btn-secondary btn-sm">
            🔄 Refresh
          </button>
          <Link to="/products" className="btn btn-primary btn-sm">
            + New Sale
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">⚠️ {error}</div>
      )}

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map((card, i) => (
          <Link key={i} to={card.link} className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-icon" style={{ background: card.bg }}>{card.icon}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
            <div className="stat-sub">{card.sub}</div>
          </Link>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Quick Actions */}
        <div className="card card-pad">
          <div className="section-header">
            <span className="section-title">🚀 Quick Actions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Link to="/products" className="btn btn-primary btn-full">
              🛍️ Browse & Add to Cart
            </Link>
            <Link to="/orders" className="btn btn-secondary btn-full">
              📋 View All Orders
            </Link>
            <Link to="/inventory" className="btn btn-secondary btn-full">
              📦 Manage Inventory
            </Link>
            <Link to="/simulation" className="btn btn-outline btn-full">
              ⚡ Run Concurrency Test
            </Link>
          </div>

          <hr className="divider" />

          <div className="section-title" style={{ marginBottom: '0.75rem' }}>✅ System Features</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { icon: '🔒', label: 'Stock reserved safely during checkout (5 min timer)' },
              { icon: '⚡', label: 'No overselling — even under many simultaneous orders' },
              { icon: '💳', label: 'Duplicate payments blocked automatically' },
              { icon: '🔄', label: 'Expired reservations auto-released by background job' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                <span style={{ flexShrink: 0, fontSize: '0.95rem' }}>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card card-pad">
          <div className="section-header">
            <span className="section-title">📋 Recent Orders</span>
            <Link to="/orders" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              View all →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🛒</div>
              <h3>No orders yet</h3>
              <p style={{ fontSize: '0.82rem' }}>Start by browsing products and adding to cart.</p>
              <Link to="/products" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.orderId}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.78rem' }}>{order.orderId}</td>
                      <td style={{ fontWeight: 700 }}>${order.totalAmount?.toFixed(2)}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>
                        <Link to={`/orders/${order.orderId}`} className="btn btn-secondary btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
