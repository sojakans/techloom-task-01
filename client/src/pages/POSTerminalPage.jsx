import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api/client';

const POSTerminalPage = () => {
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, clearCart, showToast } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProducts();
      setProducts(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    const handleUpdate = () => fetchProducts();
    window.addEventListener('products_updated', handleUpdate);
    return () => window.removeEventListener('products_updated', handleUpdate);
  }, []);

  const categories = ['ALL', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.productId?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const getItemCartQuantity = (productId) => {
    const item = cart?.items?.find((i) => i.productId === productId);
    return item ? item.quantity : 0;
  };

  const handleAddOrIncrement = async (product) => {
    const currentQty = getItemCartQuantity(product.productId);
    const maxAvailable = product.availableStock || 0;
    if (currentQty >= maxAvailable) {
      showToast(`Insufficient stock: Only ${maxAvailable} available to sell (ATS)`, 'warning');
      return;
    }
    await addToCart(product.productId, currentQty + 1);
  };

  const handleDecrement = async (product) => {
    const currentQty = getItemCartQuantity(product.productId);
    if (currentQty <= 1) {
      await removeFromCart(product.productId);
    } else {
      await addToCart(product.productId, currentQty - 1);
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'NEXUS10') {
      setDiscountPercent(10);
      showToast('Promo code NEXUS10 applied! 10% discount', 'success');
    } else if (promoCode.trim().toUpperCase() === 'TECHLOOM20') {
      setDiscountPercent(20);
      showToast('VIP code applied! 20% discount', 'success');
    } else {
      showToast('Invalid promo code. Try NEXUS10', 'danger');
    }
  };

  // Cart Calculations
  const subtotal = cart?.items ? cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.0825; // 8.25%
  const estimatedTax = taxableAmount * taxRate;
  const totalAmount = taxableAmount + estimatedTax;

  const handleProceedToCheckout = () => {
    if (!cart?.items || cart.items.length === 0) {
      showToast('Please add items to cart before checking out', 'warning');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="page-body">
      {/* POS Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
              TERMINAL 01
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Barcode Scanner Active (HID Emulation)</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            POS Terminal — Create Order
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchProducts} className="btn btn-secondary btn-sm">
            🔄 Refresh Stock
          </button>
          <button
            onClick={() => {
              if (window.confirm('Clear active cart?')) clearCart();
            }}
            disabled={!cart?.items?.length}
            className="btn btn-outline btn-sm"
          >
            🗑️ Clear Register
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {/* POS Terminal 2-Column Split Layout */}
      <div className="pos-terminal-layout">
        {/* Left Column: Product Catalog & Search */}
        <div>
          {/* Fast Search Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Scan barcode or search SKU / item name (e.g. ESP32, OLED, RPI5)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '20px', padding: '0.35rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {loading && products.length === 0 ? (
            <div className="center-loading" style={{ padding: '3rem 0' }}>
              <div className="spinner" style={{ width: 36, height: 36 }} />
              <p>Loading active product catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="card card-pad empty-state" style={{ padding: '3rem 1rem' }}>
              <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🔍</div>
              <h3>No items match your search</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Try clearing your filters or seed sample inventory items.</p>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }} className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>
                Reset Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {filteredProducts.map((p) => {
                const inCartQty = getItemCartQuantity(p.productId);
                const ats = p.availableStock ?? 0;
                const reserved = p.reservedStock ?? 0;
                const physical = ats + reserved;
                const isOutOfStock = ats === 0;
                const isInsufficient = inCartQty >= ats;

                return (
                  <div
                    key={p.productId || p._id}
                    className="card"
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: inCartQty > 0 ? '1.5px solid #4f63ff' : '1px solid var(--border)',
                      background: isOutOfStock ? '#fafafa' : '#ffffff',
                      boxShadow: inCartQty > 0 ? '0 4px 14px rgba(79, 99, 255, 0.12)' : 'var(--shadow-sm)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b', background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                          {p.sku || p.productId}
                        </span>
                        <span className={`ats-badge ${isOutOfStock ? 'out-of-stock' : ats < 5 ? 'low-stock' : 'in-stock'}`}>
                          {isOutOfStock ? 'Sold Out' : ats < 5 ? `${ats} ATS (Low)` : `${ats} Available`}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>
                        {p.name}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginBottom: '0.6rem' }}>
                        {p.category || 'General'}
                      </div>

                      {/* ATS vs Physical Stock Breakdown */}
                      <div style={{ background: '#f8fafc', borderRadius: 6, padding: '0.4rem 0.6rem', marginBottom: '0.75rem', fontSize: '0.73rem', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                          <span>Physical Total:</span>
                          <strong>{physical}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                          <span>Reserved (Holds):</span>
                          <strong>{reserved}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', borderTop: '1px dashed #e2e8f0', paddingTop: '0.2rem', marginTop: '0.2rem' }}>
                          <span>Available to Sell:</span>
                          <strong>{ats}</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                          ${p.price?.toFixed(2)}
                        </span>
                        {inCartQty > 0 && (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4f63ff', background: '#eef0ff', padding: '0.15rem 0.5rem', borderRadius: 12 }}>
                            {inCartQty} in cart
                          </span>
                        )}
                      </div>

                      {inCartQty === 0 ? (
                        <button
                          onClick={() => handleAddOrIncrement(p)}
                          disabled={isOutOfStock}
                          className={`btn ${isOutOfStock ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                          style={{ width: '100%', justifyContent: 'center', fontWeight: 600 }}
                        >
                          {isOutOfStock ? 'Unavailable' : '+ Add to Register'}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleDecrement(p)}
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, padding: '0.35rem 0', fontWeight: 800 }}
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <span style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                            {inCartQty}
                          </span>
                          <button
                            onClick={() => handleAddOrIncrement(p)}
                            disabled={isInsufficient}
                            className={`btn ${isInsufficient ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                            style={{ flex: 1, padding: '0.35rem 0', fontWeight: 800, opacity: isInsufficient ? 0.5 : 1 }}
                            title={isInsufficient ? 'Insufficient stock to increase' : 'Increase quantity'}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Cart Ledger */}
        <div className="pos-cart-sticky">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🛒 Cart Ledger
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                Session: {api.getSessionId().substring(0, 10)}
              </div>
            </div>
            <span style={{ background: '#4f63ff', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 20 }}>
              {cart?.items ? cart.items.reduce((s, i) => s + i.quantity, 0) : 0} items
            </span>
          </div>

          {/* Cart items list */}
          <div className="pos-cart-items-scroll">
            {!cart?.items || cart.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧾</div>
                <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>Register is empty</div>
                <div style={{ fontSize: '0.78rem' }}>Scan items or click "+ Add to Register"</div>
              </div>
            ) : (
              cart.items.map((item) => {
                const prod = products.find((p) => p.productId === item.productId);
                const maxAvailable = prod?.availableStock ?? 99;
                const isMax = item.quantity >= maxAvailable;

                return (
                  <div key={item.productId} className="pos-cart-item">
                    <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-900)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                        ${item.price?.toFixed(2)} each
                      </div>
                      {isMax && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>
                          ⚠️ Max stock ({maxAvailable}) reached
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => prod && handleDecrement(prod)}
                        className="btn btn-secondary btn-sm"
                        style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => prod && handleAddOrIncrement(prod)}
                        disabled={isMax}
                        className="btn btn-secondary btn-sm"
                        style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, opacity: isMax ? 0.4 : 1 }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ minWidth: 60, textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: 'var(--gray-900)' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Promo code box */}
          <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Promo Code (NEXUS10)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="input-field"
                style={{ flex: 1, padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
              />
              <button onClick={handleApplyPromo} className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                Apply
              </button>
            </div>
            {discountPercent > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.3rem' }}>
                ✓ {discountPercent}% discount active
              </div>
            )}
          </div>

          {/* Financial Breakdown */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-soft)' }}>
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>Discount ({discountPercent}%):</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-soft)' }}>
              <span>Estimated Tax (8.25%):</span>
              <span>${estimatedTax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span>Total:</span>
              <span style={{ color: '#4f63ff' }}>${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* 5-Minute Reservation Guarantee Notice & CTA */}
          <div style={{ marginTop: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.65rem', fontSize: '0.74rem', color: '#1e40af', display: 'flex', gap: '0.4rem' }}>
            <span>⏱️</span>
            <span>
              <strong>5-Minute Hold Guarantee:</strong> Proceeding locks physical inventory for 300 seconds to prevent overselling.
            </span>
          </div>

          <button
            onClick={handleProceedToCheckout}
            disabled={!cart?.items?.length || checkingOut}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.85rem', fontWeight: 800, fontSize: '0.95rem', borderRadius: 10, justifyContent: 'center' }}
          >
            🔒 Lock Stock & Proceed to Checkout (${totalAmount.toFixed(2)}) →
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSTerminalPage;
