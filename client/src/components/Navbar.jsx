import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api/client';

const Navbar = () => {
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
      showToast(res.message || 'Products seeded successfully', 'success');
      await fetchCart();
      window.dispatchEvent(new CustomEvent('products_updated'));
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSeeding(false);
    }
  };

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/products', label: 'POS Catalog', icon: '🛍️' },
    { path: '/inventory', label: 'Inventory Admin', icon: '📦' },
    { path: '/cart', label: 'Cart', icon: '🛒', badge: totalItems },
    { path: '/orders', label: 'Orders', icon: '📋' },
    { path: '/simulation', label: 'Concurrency Lab', icon: '⚡' },
  ];

  return (
    <header
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: '0 0 15px var(--primary-glow)',
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                Techloom POS
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Concurrency-Safe Engine
              </div>
            </div>
          </Link>

          {/* Server status pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              background: serverOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${serverOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: serverOnline ? '#34d399' : '#f87171',
            }}
            title={serverOnline ? 'Backend API connected' : 'Backend offline or connecting'}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                boxShadow: '0 0 6px currentColor',
              }}
            />
            <span>{serverOnline === null ? 'Checking...' : serverOnline ? 'API Connected' : 'API Offline'}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
                {link.badge > 0 && (
                  <span
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                      boxShadow: '0 0 8px var(--primary-glow)',
                    }}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions (Seed & Session Switcher) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn btn-secondary btn-sm"
            title="Seed sample products into database"
          >
            {seeding ? 'Seeding...' : '🌱 Seed Catalog'}
          </button>

          <button
            onClick={resetSession}
            className="btn btn-secondary btn-sm"
            title="Switch Session ID to simulate a different user"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
          >
            👤 {sessionId.substring(0, 10)}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
