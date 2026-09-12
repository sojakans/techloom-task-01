import React from 'react';
import { useCart } from '../context/CartContext';

const ICONS = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };

const Toast = () => {
  const { toast, setToast } = useCart();
  if (!toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast ${toast.type || 'info'}`}>
        <span className="toast-icon">{ICONS[toast.type] || 'ℹ️'}</span>
        <span style={{ flex: 1 }}>{toast.message}</span>
        <button
          onClick={() => setToast(null)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}
        >✕</button>
      </div>
    </div>
  );
};

export default Toast;
