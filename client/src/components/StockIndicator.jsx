import React from 'react';

const StockIndicator = ({ availableStock, reservedStock = 0, showDetails = false }) => {
  let statusClass = 'in-stock';
  let label = 'In Stock';

  if (availableStock <= 0) {
    statusClass = 'out-stock';
    label = 'Out of Stock';
  } else if (availableStock <= 5) {
    statusClass = 'low-stock';
    label = 'Low Stock';
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
      <div className={`stock-pill ${statusClass}`}>
        <span className="stock-dot"></span>
        <span>{label} ({availableStock})</span>
      </div>
      {showDetails && reservedStock > 0 && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          🔒 {reservedStock} reserved
        </span>
      )}
    </div>
  );
};

export default StockIndicator;
