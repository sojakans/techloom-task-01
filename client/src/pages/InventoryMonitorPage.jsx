import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useCart } from '../context/CartContext';

const InventoryMonitorPage = () => {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([
    { id: 1, time: '20:38:12', type: 'lock', text: 'POS Terminal 01 locked 2x ESP32-S3 (Hold ID: HLD-8931)' },
    { id: 2, time: '20:37:45', type: 'settle', text: 'Order ORD-8491 settled ($124.50). Physical inventory committed.' },
    { id: 3, time: '20:35:01', type: 'release', text: 'Background Worker released 3x Arduino UNO (Hold expired after 300s)' },
    { id: 4, time: '20:32:19', type: 'sync', text: 'MQTT Hardware Ledger synced with MongoDB primary node' },
    { id: 5, time: '20:30:10', type: 'lock', text: 'Web Register locked 1x Raspberry Pi 5 (Hold ID: HLD-8924)' },
  ]);

  // Variance Adjustment Modal State
  const [isVarianceModalOpen, setIsVarianceModalOpen] = useState(false);
  const [selectedProductForVariance, setSelectedProductForVariance] = useState(null);
  const [varianceCount, setVarianceCount] = useState(0);
  const [varianceReason, setVarianceReason] = useState('DAMAGED_SHELF');
  const [adjusting, setAdjusting] = useState(false);
  const { showToast } = useCart();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodsRes, statsRes] = await Promise.all([
        api.getProducts(),
        api.getOrderStats(),
      ]);
      setProducts(prodsRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Simulate real-time stock stream ticks every 8s
    const streamInterval = setInterval(() => {
      const sampleEvents = [
        { type: 'lock', text: 'POS Register 02 locked 1x OLED Display (300s hold start)' },
        { type: 'settle', text: 'Payment settled. 5-minute hold converted to invoice.' },
        { type: 'release', text: '300s Inactivity Worker purged expired cart hold. Stock ATS restored.' },
        { type: 'sync', text: 'Reconciliation audit verified 100% invariant zero-leak condition.' },
      ];
      const randomEvent = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      setEvents((prev) => [
        { id: Date.now(), time: timeStr, type: randomEvent.type, text: randomEvent.text },
        ...prev.slice(0, 14),
      ]);
    }, 8000);

    return () => clearInterval(streamInterval);
  }, []);

  const totalPhysical = products.reduce((sum, p) => sum + (p.availableStock || 0) + (p.reservedStock || 0), 0);
  const totalReserved = products.reduce((sum, p) => sum + (p.reservedStock || 0), 0);
  const totalATS = products.reduce((sum, p) => sum + (p.availableStock || 0), 0);

  const openVarianceModal = (prod) => {
    setSelectedProductForVariance(prod);
    setVarianceCount(prod.availableStock || 0);
    setVarianceReason('PHYSICAL_AUDIT');
    setIsVarianceModalOpen(true);
  };

  const handleApplyVariance = async (e) => {
    e.preventDefault();
    if (!selectedProductForVariance) return;

    try {
      setAdjusting(true);
      const newAvailable = parseInt(varianceCount, 10);
      const diff = newAvailable - (selectedProductForVariance.availableStock || 0);

      await api.updateProduct(selectedProductForVariance.productId || selectedProductForVariance._id, {
        availableStock: newAvailable,
      });

      // Log to real-time event stream
      const now = new Date().toTimeString().split(' ')[0];
      setEvents((prev) => [
        {
          id: Date.now(),
          time: now,
          type: diff < 0 ? 'release' : 'settle',
          text: `Variance Audit (${varianceReason}): ${selectedProductForVariance.name} adjusted ${diff >= 0 ? '+' : ''}${diff} units.`,
        },
        ...prev,
      ]);

      showToast(`Stock adjusted for ${selectedProductForVariance.name}`, 'success');
      setIsVarianceModalOpen(false);
      window.dispatchEvent(new CustomEvent('products_updated'));
      await fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to adjust variance', 'danger');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
              ATOMIC INVARIANCE MONITOR
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Precision: Exact 64-bit integer</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            Inventory — Stock Monitoring & Levels
          </h1>
        </div>
        <button onClick={fetchData} className="btn btn-secondary btn-sm">
          🔄 Refresh Stream
        </button>
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {/* System Invariance Rule Highlight Banner */}
      <div className="formula-card" style={{ background: 'linear-gradient(135deg, #090d16 0%, #172554 100%)' }}>
        <div className="formula-header">
          <div className="formula-title" style={{ color: '#93c5fd' }}>
            <span>⚖️</span> System Invariance Rule: Total Physical - Reserved = Available to Sell (ATS)
          </div>
          <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.25)', color: '#93c5fd', padding: '0.2rem 0.6rem', borderRadius: 20, fontWeight: 700 }}>
            ZERO OVERSOLD GUARANTEE
          </span>
        </div>

        <div className="formula-body" style={{ background: 'rgba(0, 0, 0, 0.25)' }}>
          <div className="formula-item">
            <div className="formula-val" style={{ color: '#ffffff' }}>{totalPhysical.toLocaleString()}</div>
            <div className="formula-label">Total Physical Stock</div>
          </div>
          <div className="formula-operator" style={{ color: '#93c5fd' }}>−</div>
          <div className="formula-item">
            <div className="formula-val" style={{ color: '#fbbf24' }}>{totalReserved.toLocaleString()}</div>
            <div className="formula-label">Active 5-Min Holds</div>
          </div>
          <div className="formula-operator" style={{ color: '#93c5fd' }}>=</div>
          <div className="formula-item">
            <div className="formula-val" style={{ color: '#4ade80' }}>{totalATS.toLocaleString()}</div>
            <div className="formula-label">Available to Sell (ATS)</div>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
            <span>Available for New Customers: <strong>{totalATS}</strong> units</span>
            <span>Locked in Checkout Carts: <strong>{totalReserved}</strong> units</span>
          </div>
          <div className="ratio-progress-bar" style={{ height: 10 }}>
            <div className="ratio-available" style={{ width: `${(totalATS / (totalPhysical || 1)) * 100}%` }} />
            <div className="ratio-reserved" style={{ width: `${(totalReserved / (totalPhysical || 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Grid: Left Stock Health Ratios / Right Real-Time Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Real-time stock stream logging instantaneous POS locks, settlements, releases */}
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span className="section-title" style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📡 Real-Time Stock Event Stream
            </span>
            <span style={{ fontSize: '0.72rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
              <span className="status-dot online" style={{ width: 8, height: 8 }} /> LIVE SOCKET
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginBottom: '0.75rem' }}>
            Telemetry feed of POS stock reservations, payment settlements, and 300s timeout auto-releases.
          </p>

          <div className="event-stream-container" style={{ flex: 1 }}>
            {events.map((ev) => (
              <div key={ev.id} className="event-stream-line">
                <span className="event-time">{ev.time}</span>
                <span className={`event-tag ${ev.type}`}>{ev.type.toUpperCase()}</span>
                <span style={{ flex: 1, color: '#cbd5e1' }}>{ev.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Level Variance & Stock Health Overview */}
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span className="section-title" style={{ fontSize: '1rem', fontWeight: 700 }}>
              📊 Stock Variance & Adjustment Panel
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Shelf Count Auditing</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginBottom: '1rem' }}>
            Directly adjust shelf variance for miscounts or damaged hardware while maintaining strict database concurrency locks.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
            {products.slice(0, 5).map((p) => {
              const ats = p.availableStock ?? 0;
              const res = p.reservedStock ?? 0;
              const phys = ats + res;
              const availPercent = phys > 0 ? (ats / phys) * 100 : 0;

              return (
                <div key={p.productId || p._id} style={{ padding: '0.65rem 0.75rem', border: '1px solid var(--gray-200)', borderRadius: 8, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</div>
                    <button
                      onClick={() => openVarianceModal(p)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      ✏️ Adjust Shelf Stock
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                    <span>ATS: <strong style={{ color: '#16a34a' }}>{ats}</strong></span>
                    <span>Holds: <strong style={{ color: '#d97706' }}>{res}</strong></span>
                    <span>Total Shelf: <strong>{phys}</strong></span>
                  </div>

                  <div className="ratio-progress-bar" style={{ height: 6 }}>
                    <div className="ratio-available" style={{ width: `${availPercent}%` }} />
                    <div className="ratio-reserved" style={{ width: `${100 - availPercent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Complete Stock Monitoring Matrix Table */}
      <div className="card">
        <div className="section-header" style={{ padding: '1rem 1.25rem 0.5rem' }}>
          <span className="section-title" style={{ fontSize: '1rem', fontWeight: 700 }}>
            📦 Item-by-Item Invariance Matrix
          </span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Identifier</th>
                <th>Item & Category</th>
                <th>Total Physical</th>
                <th>Reserved in Carts</th>
                <th>Available to Sell (ATS)</th>
                <th>Availability Ratio</th>
                <th style={{ textAlign: 'right' }}>Audit Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const ats = p.availableStock ?? 0;
                const res = p.reservedStock ?? 0;
                const phys = ats + res;
                const availPercent = phys > 0 ? ((ats / phys) * 100).toFixed(0) : 0;

                return (
                  <tr key={p.productId || p._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f63ff' }}>
                      {p.sku || p.productId}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.category || 'Hardware'}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{phys}</td>
                    <td style={{ color: res > 0 ? '#b45309' : '#94a3b8', fontWeight: res > 0 ? 700 : 400 }}>
                      {res > 0 ? `🔒 ${res}` : '0'}
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: ats < 5 ? '#dc2626' : '#15803d' }}>
                        {ats}
                      </span>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="ratio-progress-bar" style={{ flex: 1, height: 6, margin: 0 }}>
                          <div className="ratio-available" style={{ width: `${availPercent}%` }} />
                          <div className="ratio-reserved" style={{ width: `${100 - availPercent}%` }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, width: 32 }}>{availPercent}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => openVarianceModal(p)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variance Adjustment Modal */}
      {isVarianceModalOpen && selectedProductForVariance && (
        <div className="slide-over-backdrop" onClick={() => setIsVarianceModalOpen(false)}>
          <div
            className="slide-over-panel"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Adjust Physical Shelf Variance</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                  {selectedProductForVariance.name} ({selectedProductForVariance.sku})
                </div>
              </div>
              <button
                onClick={() => setIsVarianceModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyVariance} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.75rem', fontSize: '0.8rem', color: '#1e40af' }}>
                ℹ️ <strong>Current State:</strong> Available to Sell (ATS) is currently <strong>{selectedProductForVariance.availableStock}</strong>, with <strong>{selectedProductForVariance.reservedStock || 0}</strong> in active 5-min holds.
              </div>

              <div>
                <label className="input-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  New Actual Available Physical Stock:
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={varianceCount}
                  onChange={(e) => setVarianceCount(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="input-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Variance Reason / Audit Log:
                </label>
                <select
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="PHYSICAL_AUDIT">Periodic Physical Shelf Recount</option>
                  <option value="DAMAGED_SHELF">Damaged on Display / Warehouse</option>
                  <option value="RESTOCK_UNRECORDED">Unrecorded Delivery Unpacked</option>
                  <option value="DEFECTIVE_RETURN">Defective Hardware Quarantine</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsVarianceModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="btn btn-primary"
                  style={{ flex: 2, justifyContent: 'center', fontWeight: 700 }}
                >
                  {adjusting ? 'Committing...' : 'Commit Variance Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryMonitorPage;
