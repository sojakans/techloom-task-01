import React, { useState, useEffect } from 'react';
import api from '../api/client';

const ProductModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [availableStock, setAvailableStock] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const isEdit = Boolean(product);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setPrice(product.price?.toString() || '');
      setAvailableStock(product.availableStock?.toString() || '');
    } else {
      setName('');
      setPrice('');
      setAvailableStock('');
    }
    setErrors([]);
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    // Frontend validation
    const clientErrors = [];
    if (!name.trim()) clientErrors.push('Product name is required');
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) clientErrors.push('Price must be a non-negative number');
    const numStock = parseInt(availableStock, 10);
    if (isNaN(numStock) || numStock < 0) clientErrors.push('Available stock must be a non-negative integer');

    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        price: numPrice,
        availableStock: numStock,
      };

      if (isEdit) {
        await api.updateProduct(product.productId, payload);
      } else {
        await api.createProduct(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrors(err.errors?.length ? err.errors : [err.message]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Product' : 'Add New Product'}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.length > 0 && (
              <div className="alert alert-danger">
                <div>
                  {errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ergonomic Office Chair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="e.g. 199.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Available Stock *</label>
              <input
                type="number"
                step="1"
                min="0"
                className="form-input"
                placeholder="e.g. 50"
                value={availableStock}
                onChange={(e) => setAvailableStock(e.target.value)}
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                Stock value will be guarded by concurrency-safe atomic operations on checkout.
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : (isEdit ? 'Save Changes' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
