import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api/client';

const Sidebar = () => {
  const location = useLocation();
  const { totalItems, sessionId, resetSession, showToast, fetchCart } = useCart();
  const [serverOnline, setServerOnline] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const checkServer = async () => {
      try {
        await api.checkHealth();
        setServerOnline(true);
      } catch {
        setServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await api.seedProducts();
      showToast(res.message || 'Products seeded!', 'success');
      await fetchCart();
      window.dispatchEvent(new CustomEvent('products_updated'));
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSeeding(false);
    }
  };

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { path: '/', label: 'Dashboard', icon: '🏠' },
      ],
    },
    {
      label: 'Sell',
      items: [
        { path: '/products', label: 'Browse Products', icon: '🛍️' },
        { path: '/cart', label: 'My Cart', icon: '🛒', badge: totalItems },
        { path: '/checkout', label: 'Checkout', icon: '💳' },
      ],
    },
    {
      label: 'Manage',
      items: [
        { path: '/orders', label: 'All Orders', icon: '📋' },
        { path: '/inventory', label: 'Inventory', icon: '📦' },
      ],
    },
    {
      label: 'Testing',
      items: [
        { path: '/simulation', label: 'Stress Test', icon: '⚡' },
      ],
    },
  ];

  const statusColor = serverOnline === null ? 'checking' : serverOnline ? 'online' : 'offline';
  const statusText = serverOnline === null ? 'Connecting...' : serverOnline ? 'Server Online' : 'Server Offline';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <Link to="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">🏪</div>
          <div>
            <div className="sidebar-logo-text">Techloom POS</div>
            <div className="sidebar-logo-sub">Point of Sale System</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="sidebar-section-label">{group.label}</div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Seed Button */}
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#a8b5cc',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s',
            }}
          >
            🌱 {seeding ? 'Adding Products...' : 'Add Sample Products'}
          </button>
        </div>
      </nav>

      {/* Footer: status + session */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className={`status-dot ${statusColor}`} />
          <span style={{ color: '#a8b5cc', flex: 1 }}>{statusText}</span>
        </div>
        <button
          onClick={resetSession}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            padding: '0.5rem 0.75rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: '#a8b5cc',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          title="Switch to a new customer session"
        >
          👤 Customer: {sessionId.substring(0, 8)}...
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
