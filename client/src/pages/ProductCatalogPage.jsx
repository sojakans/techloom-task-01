import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useCart } from '../context/CartContext';

const ProductCatalogPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { showToast } = useCart();

  // Slide-over Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Microcontrollers');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
  }, []);

  const openSlideOver = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setFormName(prod.name || '');
      setFormSku(prod.sku || prod.productId || '');
      setFormCategory(prod.category || 'Microcontrollers');
      setFormPrice(prod.price?.toString() || '');
      setFormStock(prod.availableStock?.toString() || '');
      setFormDescription(prod.description || '');
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormSku(`NX-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
      setFormCategory('Microcontrollers');
      setFormPrice('24.99');
      setFormStock('50');
      setFormDescription('');
    }
    setIsSlideOverOpen(true);
  };

  const generateRandomSku = () => {
    const prefix = formCategory ? formCategory.substring(0, 3).toUpperCase() : 'NX';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormSku(`${prefix}-${rand}`);
  };

  // Automated Stock Classification
  const stockNum = parseInt(formStock, 10) || 0;
  const priceNum = parseFloat(formPrice) || 0;
  const getClassification = (qty, price) => {
    if (qty === 0) return { label: 'Out of Stock Risk', color: '#ef4444', bg: '#fee2e2' };
    if (qty < 10) return { label: 'Low Stock Alert Risk', color: '#f97316', bg: '#ffedd5' };
    if (price > 100) return { label: 'High-Value Tier Asset', color: '#8b5cf6', bg: '#f5f3ff' };
    if (qty >= 100) return { label: 'Bulk Wholesale Tier', color: '#3b82f6', bg: '#eff6ff' };
    return { label: 'Standard Catalog Asset', color: '#10b981', bg: '#ecfdf5' };
  };
  const activeClassification = getClassification(stockNum, priceNum);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice || !formStock) {
      showToast('Please fill out all required fields', 'danger');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formName.trim(),
        sku: formSku.trim(),
        category: formCategory,
        price: parseFloat(formPrice),
        availableStock: parseInt(formStock, 10),
        description: formDescription.trim(),
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.productId || editingProduct._id, payload);
        showToast(`Product "${formName}" updated successfully!`, 'success');
      } else {
        await api.createProduct(payload);
        showToast(`Product "${formName}" added to catalog!`, 'success');
      }

      setIsSlideOverOpen(false);
      window.dispatchEvent(new CustomEvent('products_updated'));
      await fetchProducts();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p) => {
    if ((p.reservedStock || 0) > 0) {
      showToast(`Cannot delete "${p.name}" — active 5-min holds exist!`, 'danger');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${p.name} (${p.sku})?`)) return;

    try {
      setDeletingId(p.productId);
      await api.deleteProduct(p.productId);
      showToast(`Deleted ${p.name}`, 'info');
      await fetchProducts();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setDeletingId(null);
    }
  };

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

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
              CATALOG MATRIX
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{products.length} registered SKUs</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            Products — Catalog & Management
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchProducts} className="btn btn-secondary btn-sm">
            🔄 Refresh
          </button>
          <button onClick={() => openSlideOver()} className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
            + Add New Product (Slide-Over)
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search by SKU, product name, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '100%', padding: '0.6rem 0.85rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '20px', padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabular View */}
      {loading && products.length === 0 ? (
        <div className="center-loading" style={{ padding: '3rem 0' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading catalog items...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card card-pad empty-state" style={{ padding: '3rem 1rem' }}>
          <div className="empty-state-icon" style={{ fontSize: '3rem' }}>📦</div>
          <h3>No products in catalog</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Create a product or use the seed button in the sidebar.</p>
          <button onClick={() => openSlideOver()} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
            + Create First Product
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU / Identifier</th>
                  <th>Product Name & Category</th>
                  <th>Unit Price</th>
                  <th>Physical Stock</th>
                  <th>5-Min Holds</th>
                  <th>Available (ATS)</th>
                  <th>Inventory Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const ats = p.availableStock ?? 0;
                  const reserved = p.reservedStock ?? 0;
                  const physical = ats + reserved;

                  return (
                    <tr key={p.productId || p._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: '#4f63ff' }}>
                        {p.sku || p.productId}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{p.category || 'General'}</div>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                        ${p.price?.toFixed(2)}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {physical}
                      </td>
                      <td style={{ color: reserved > 0 ? '#b45309' : '#94a3b8', fontWeight: reserved > 0 ? 700 : 400 }}>
                        {reserved > 0 ? `🔒 ${reserved}` : '0'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: ats <= 3 ? '#dc2626' : '#15803d' }}>
                          {ats}
                        </span>
                      </td>
                      <td>
                        {ats === 0 ? (
                          <span className="ats-badge out-of-stock">Depleted</span>
                        ) : ats < 5 ? (
                          <span className="ats-badge low-stock">Low Stock ({ats})</span>
                        ) : (
                          <span className="ats-badge in-stock">Healthy ATS</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => openSlideOver(p)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.productId || reserved > 0}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5' }}
                            title={reserved > 0 ? 'Active reservations prevent deletion' : 'Delete item'}
                          >
                            {deletingId === p.productId ? '...' : 'Del'}
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

      {/* Slide-over Drawer for Add/Edit Product */}
      {isSlideOverOpen && (
        <div className="slide-over-backdrop" onClick={() => setIsSlideOverOpen(false)}>
          <div className="slide-over-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
                  {editingProduct ? 'Edit Catalog Item' : 'Add New Product'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                  Slide-over real-time inventory provisioner
                </div>
              </div>
              <button
                onClick={() => setIsSlideOverOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Body Form */}
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {/* Classification Badge */}
              <div style={{ background: activeClassification.bg, border: `1px solid ${activeClassification.color}40`, borderRadius: 8, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>Automated Classification:</div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: activeClassification.color }}>
                  {activeClassification.label}
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="input-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Product Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raspberry Pi 5 (8GB)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              {/* SKU / Barcode Generator */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label className="input-label" style={{ fontWeight: 700, fontSize: '0.82rem', margin: 0 }}>
                    SKU / Barcode ID <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomSku}
                    style={{ background: 'none', border: 'none', color: '#4f63ff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    🎲 Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="input-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="Microcontrollers">Microcontrollers</option>
                  <option value="Sensors">Sensors</option>
                  <option value="Displays">Displays</option>
                  <option value="SBCs">Single Board Computers (SBCs)</option>
                  <option value="Power">Power & Batteries</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              {/* Price & Stock Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="input-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Unit Price ($) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="29.99"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="input-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Stock Quantity <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="50"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="input-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Product Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Specification details, shelf aisle, or manufacturer notes..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Invariant Policy Reminder */}
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '0.75rem', fontSize: '0.73rem', color: '#64748b' }}>
                🔒 <strong>Atomic Rule:</strong> New stock is immediately available to sell (ATS) and will be protected by the 5-minute atomic reservation engine once added to customer carts.
              </div>

              {/* Submit Buttons */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setIsSlideOverOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ flex: 2, justifyContent: 'center', fontWeight: 700 }}
                >
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create & Classify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalogPage;
