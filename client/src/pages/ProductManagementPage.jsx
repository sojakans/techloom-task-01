import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import ProductModal from '../components/ProductModal';

const ProductManagementPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { showToast } = useCart();

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

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (productId, name, reservedStock) => {
    if (reservedStock > 0) {
      showToast(`Cannot delete "${name}" — it has active reservations`, 'danger');
      return;
    }
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      setDeletingId(productId);
      await api.deleteProduct(productId);
      showToast(`"${name}" deleted`, 'info');
      await fetchProducts();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalSuccess = () => {
    showToast(selectedProduct ? 'Product updated!' : 'Product added!', 'success');
    fetchProducts();
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">📦 Inventory</h1>
          <p className="page-subtitle">Manage your product catalog and stock levels</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchProducts} className="btn btn-secondary btn-sm">🔄 Refresh</button>
          <button onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }} className="btn btn-primary btn-sm">
            + Add Product
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {loading && products.length === 0 ? (
        <div className="center-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading inventory...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="card card-pad empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No products yet</h3>
          <p style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>Add your first product or use "Add Sample Products" from the sidebar.</p>
          <button onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }} className="btn btn-primary btn-sm">
            + Add First Product
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isOut = p.availableStock <= 0;
                  const isLow = !isOut && p.availableStock <= 5;
                  return (
                    <tr key={p.productId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.productId}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>${p.price.toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: isOut ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--green-dark)' }}>
                        {p.availableStock}
                      </td>
                      <td style={{ color: p.reservedStock > 0 ? 'var(--blue)' : 'var(--text-muted)' }}>
                        {p.reservedStock > 0 ? `🔒 ${p.reservedStock}` : '—'}
                      </td>
                      <td>
                        {isOut ? (
                          <span className="stock-pill stock-out">Out of stock</span>
                        ) : isLow ? (
                          <span className="stock-pill stock-low">Low stock</span>
                        ) : (
                          <span className="stock-pill stock-in">In stock</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => { setSelectedProduct(p); setIsModalOpen(true); }} className="btn btn-secondary btn-sm">
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p.productId, p.name, p.reservedStock)}
                            disabled={deletingId === p.productId}
                            className="btn btn-danger btn-sm"
                          >
                            {deletingId === p.productId ? '...' : '🗑️'}
                          </button>
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

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default ProductManagementPage;
