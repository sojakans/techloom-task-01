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
      showToast(res.message || 'Catalog seeded successfully!', 'success');
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
      label: 'Telemetry & Overview',
      items: [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/inventory', label: 'Stock Monitor', icon: '📈' },
        { path: '/reservations', label: '5-Min Hold Ledger', icon: '⏳' },
      ],
    },
    {
      label: 'POS & Operations',
      items: [
        { path: '/terminal', label: 'POS Terminal', icon: '💻', badge: totalItems },
        { path: '/catalog', label: 'Product Catalog', icon: '📦' },
        { path: '/orders', label: 'Orders Ledger', icon: '📋' },
      ],
    },
    {
      label: 'System & Architecture',
      items: [
        { path: '/payment-states', label: 'Payment States', icon: '🛡️' },
        { path: '/simulation', label: 'Concurrency Lab', icon: '⚡' },
      ],
    },
  ];

  const statusColor = serverOnline === null ? 'checking' : serverOnline ? 'online' : 'offline';
  const statusText = serverOnline === null ? 'Connecting...' : serverOnline ? 'API & DB Ready' : 'Server Offline';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <Link to="/" className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: 'linear-gradient(135deg, #4f63ff, #8b5cf6)', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, fontWeight: 800 }}>
            NX
          </div>
          <div>
            <div className="sidebar-logo-text" style={{ letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              NexusPOS <span style={{ fontSize: '0.65rem', background: 'rgba(79,99,255,0.25)', color: '#818cf8', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>PRO</span>
            </div>
            <div className="sidebar-logo-sub">Atomic Invariant System</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: '1.2rem' }}>
            <div className="sidebar-section-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', padding: '0 0.5rem', marginBottom: '0.35rem' }}>
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="nav-badge" style={{ background: '#4f63ff', color: '#fff' }}>{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Quick Seed Action */}
        <div style={{ marginTop: '0.5rem', padding: '0 0.25rem' }}>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s',
            }}
          >
            🌱 {seeding ? 'Syncing...' : 'Seed Sample Catalog'}
          </button>
        </div>
      </nav>

      {/* Footer: status + session */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className={`status-dot ${statusColor}`} />
          <span style={{ color: '#94a3b8', fontSize: '0.75rem', flex: 1 }}>{statusText}</span>
        </div>
        <button
          onClick={resetSession}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            padding: '0.45rem 0.65rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: '#94a3b8',
            fontSize: '0.72rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          title="Switch customer session"
        >
          <span>👤 Register 01</span>
          <span style={{ fontFamily: 'monospace', color: '#818cf8' }}>{sessionId.substring(0, 7)}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

