import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useCart } from '../context/CartContext';

// Map product names to friendly emojis
const getEmoji = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('coffee') || n.includes('latte') || n.includes('espresso')) return '☕';
  if (n.includes('tea')) return '🍵';
  if (n.includes('juice') || n.includes('orange')) return '🍊';
  if (n.includes('water')) return '💧';
  if (n.includes('milk')) return '🥛';
  if (n.includes('cake') || n.includes('muffin') || n.includes('pastry')) return '🎂';
  if (n.includes('sandwich') || n.includes('burger')) return '🥪';
  if (n.includes('pizza')) return '🍕';
  if (n.includes('salad')) return '🥗';
  if (n.includes('cookie') || n.includes('brownie')) return '🍪';
  if (n.includes('smoothie')) return '🥤';
  if (n.includes('soda') || n.includes('cola')) return '🥤';
  if (n.includes('phone') || n.includes('mobile')) return '📱';
  if (n.includes('laptop') || n.includes('computer')) return '💻';
  if (n.includes('shirt') || n.includes('cloth')) return '👕';
  if (n.includes('shoe') || n.includes('sneaker')) return '👟';
  return '🛒';
};

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState({});
  const [addingId, setAddingId] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const { addToCart, showToast } = useCart();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProducts();
      setProducts(res.data);
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

  const getQty = (id) => quantities[id] || 1;

  const changeQty = (id, delta, max) => {
    const newQty = Math.min(max, Math.max(1, getQty(id) + delta));
    setQuantities((prev) => ({ ...prev, [id]: newQty }));
  };

  const handleAddToCart = async (product) => {
    const qty = getQty(product.productId);
    if (product.availableStock < qty) {
      showToast(`Only ${product.availableStock} units in stock!`, 'danger');
      return;
    }
    try {
      setAddingId(product.productId);
      await addToCart(product.productId, qty);
      setAddedId(product.productId);
      setTimeout(() => setAddedId(null), 1500);
    } catch (err) {
      // toast shown by context
    } finally {
      setAddingId(null);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🛍️ Products</h1>
          <p className="page-subtitle">Pick items and add them to your cart</p>
        </div>
        <button onClick={fetchProducts} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: '1.25rem' }}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="form-input"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {loading && products.length === 0 ? (
        <div className="center-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading products...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card card-pad">
          <div className="empty-state-icon">📦</div>
          <h3>No products found</h3>
          <p style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
            {searchTerm ? 'Try a different search.' : 'Click "Add Sample Products" in the sidebar to get started.'}
          </p>
          <button onClick={fetchProducts} className="btn btn-secondary btn-sm">Reload</button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
            {filtered.length} product{filtered.length !== 1 ? 's' : ''} available
          </p>
          <div className="product-grid">
            {filtered.map((product) => {
              const isOut = product.availableStock <= 0;
              const isLow = !isOut && product.availableStock <= 5;
              const isAdding = addingId === product.productId;
              const isAdded = addedId === product.productId;
              const qty = getQty(product.productId);

              return (
                <div
                  key={product.productId}
                  className={`product-card ${isOut ? 'out-of-stock' : ''}`}
                >
                  <div className="product-emoji">{getEmoji(product.name)}</div>
                  <div className="product-name">{product.name}</div>
                  <div className="product-price">${product.price.toFixed(2)}</div>

                  {/* Stock indicator */}
                  {isOut ? (
                    <span className="stock-pill stock-out">✕ Out of stock</span>
                  ) : isLow ? (
                    <span className="stock-pill stock-low">⚠️ Only {product.availableStock} left</span>
                  ) : (
                    <span className="stock-pill stock-in">✓ {product.availableStock} in stock</span>
                  )}

                  {/* Qty & Add */}
                  {!isOut && (
                    <>
                      <div className="qty-control">
                        <button
                          className="qty-btn"
                          onClick={() => changeQty(product.productId, -1, product.availableStock)}
                          disabled={qty <= 1}
                        >−</button>
                        <span className="qty-value">{qty}</span>
                        <button
                          className="qty-btn"
                          onClick={() => changeQty(product.productId, 1, product.availableStock)}
                          disabled={qty >= product.availableStock}
                        >+</button>
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isAdding}
                        className={`btn btn-sm btn-full ${isAdded ? 'btn-success' : 'btn-primary'}`}
                        style={{ marginTop: '0.25rem' }}
                      >
                        {isAdding ? (
                          <><span className="spinner" style={{ width: 14, height: 14 }} /> Adding...</>
                        ) : isAdded ? (
                          '✓ Added!'
                        ) : (
                          '🛒 Add to Cart'
                        )}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductsPage;
