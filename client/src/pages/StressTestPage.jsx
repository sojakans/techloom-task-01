import React, { useState } from 'react';
import api from '../api/client';
import { useCart } from '../context/CartContext';

const StressTestPage = () => {
  const [initialStock, setInitialStock] = useState(5);
  const [concurrentRequests, setConcurrentRequests] = useState(10);
  const [quantityPerRequest, setQuantityPerRequest] = useState(1);
  const [productName, setProductName] = useState('Concurrency Stress Item');
  const [running, setRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const { showToast } = useCart();

  const handleRunTest = async () => {
    try {
      setRunning(true);
      setError(null);
      setTestResult(null);

      showToast(`Launching ${concurrentRequests} concurrent checkouts against ${initialStock} stock...`, 'info');

      const res = await api.runStressTest({
        productName,
        initialStock: parseInt(initialStock, 10),
        concurrentRequests: parseInt(concurrentRequests, 10),
        quantityPerRequest: parseInt(quantityPerRequest, 10),
      });

      setTestResult(res.data);

      if (res.data.allTestsPassed) {
        showToast('Concurreny Test Passed: 0 Overselling Detected!', 'success');
      } else {
        showToast('Concurrency Test Failed: Overselling Detected!', 'danger');
      }
    } catch (err) {
      console.error('Stress test error:', err);
      setError(err.message);
      showToast(err.message, 'danger');
    } finally {
      setRunning(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all orders, carts, and test data in the database?')) return;
    try {
      await api.resetTestData();
      setTestResult(null);
      showToast('Test database reset successfully', 'info');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚡ Concurrency & Oversell Test Lab</h1>
          <p className="page-subtitle">
            Simulate multiple customers attempting to buy the exact same item at the very same split second.
          </p>
        </div>
        <button onClick={handleResetData} className="btn btn-secondary">
          🧹 Reset Database
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Control Panel & Architecture Explainer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚙️ Configure Concurrency Test</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Test Product Name</label>
              <input
                type="text"
                className="form-input"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Available Stock</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="form-input"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                />
                <small style={{ color: 'var(--text-soft)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Total physical units
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Simultaneous Buyers</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  className="form-input"
                  value={concurrentRequests}
                  onChange={(e) => setConcurrentRequests(e.target.value)}
                />
                <small style={{ color: 'var(--text-soft)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Concurrent requests
                </small>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Units Requested per Buyer</label>
              <input
                type="number"
                min="1"
                max="20"
                className="form-input"
                value={quantityPerRequest}
                onChange={(e) => setQuantityPerRequest(e.target.value)}
              />
            </div>

            <div style={{ padding: '0.85rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--primary)' }}>
              💡 <strong>The Test Challenge:</strong> {concurrentRequests} buyers will each try to reserve {quantityPerRequest} unit(s) simultaneously (total demand = {concurrentRequests * quantityPerRequest}), but only {initialStock} unit(s) are in stock. Exactly {Math.floor(initialStock / quantityPerRequest)} must succeed and {concurrentRequests - Math.floor(initialStock / quantityPerRequest)} must be rejected.
            </div>

            <button
              onClick={handleRunTest}
              disabled={running}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            >
              {running ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner" />
                  Running Concurrent Checkouts...
                </span>
              ) : (
                '🚀 Launch Concurrency Test'
              )}
            </button>
          </div>
        </div>

        {/* Strategy Explainer Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🔬 How Concurrency Safety Works</h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-soft)', lineHeight: '1.6', marginBottom: '1rem' }}>
              Without concurrency safety, multiple requests read the same stock at the same time and all succeed — resulting in <strong>negative stock and overselling</strong>.
            </p>

            <div style={{ background: '#1e293b', color: '#38bdf8', padding: '1rem', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6', marginBottom: '1rem', overflowX: 'auto' }}>
              // Atomic document-level filter & update<br />
              Product.findOneAndUpdate(<br />
              &nbsp;&nbsp;&#123; productId, availableStock: &#123; $gte: qty &#125; &#125;,<br />
              &nbsp;&nbsp;&#123; $inc: &#123; availableStock: -qty, reservedStock: qty &#125; &#125;<br />
              );
            </div>

            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>Key Invariants Enforced:</h4>
            <ul style={{ fontSize: '0.82rem', color: 'var(--text-soft)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
              <li><strong>Zero Race Conditions:</strong> MongoDB checks <code>$gte: qty</code> atomically at the moment of update.</li>
              <li><strong>Zero Overselling:</strong> Stock never dips below zero under any concurrency load.</li>
              <li><strong>Instant Conflict Response:</strong> Rejected requests immediately get a clean 409 Conflict with the reason.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Test Results Dashboard */}
      {testResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Top Level Verification Status Banner */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              background: testResult.allTestsPassed ? '#f0fdf4' : '#fef2f2',
              border: `2px solid ${testResult.allTestsPassed ? 'var(--green)' : 'var(--red)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2.5rem' }}>
                  {testResult.allTestsPassed ? '🎉' : '❌'}
                </span>
                <div>
                  <h2 style={{ color: testResult.allTestsPassed ? 'var(--green-dark)' : 'var(--red-dark)', fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                    {testResult.allTestsPassed
                      ? 'CONCURRENCY TEST PASSED (Zero Overselling Verified!)'
                      : 'CONCURRENCY TEST FAILED (Overselling Occurred)'}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                    Processed {testResult.summary.successCount + testResult.summary.failCount} simultaneous checkouts in {testResult.summary.elapsedMs}ms
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center', background: '#fff', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-soft)', fontWeight: 600 }}>Successful</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green-dark)' }}>
                    {testResult.summary.successCount}
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: '#fff', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-soft)', fontWeight: 600 }}>Rejected (409)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--red-dark)' }}>
                    {testResult.summary.failCount}
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: '#fff', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-soft)', fontWeight: 600 }}>Stock Remaining</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {testResult.finalState.availableStock}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Invariants Checklist */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📋 Concurrency Invariants Verification</h3>
            </div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span>{testResult.verification.stockNeverNegative ? '✅' : '❌'}</span>
                  <span>Stock Never Negative</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '0.35rem' }}>
                  Ending stock is {testResult.finalState.availableStock} (always &ge; 0).
                </p>
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span>{testResult.verification.noOverselling ? '✅' : '❌'}</span>
                  <span>Zero Overselling</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '0.35rem' }}>
                  Granted ({testResult.summary.successCount}) &le; Allowed ({testResult.summary.maxPossible}).
                </p>
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span>{testResult.verification.exactReservations ? '✅' : '❌'}</span>
                  <span>Exact Allocation</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '0.35rem' }}>
                  All legitimate buyers allocated without false rejections.
                </p>
              </div>
            </div>
          </div>

          {/* Request Outcome Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Concurrent Requests Log</h3>
            </div>
            <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Session ID</th>
                    <th>Outcome</th>
                    <th>Response Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {testResult.results.map((r) => (
                    <tr key={r.request}>
                      <td style={{ fontWeight: 700 }}>#{r.request}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                        {r.sessionId}
                      </td>
                      <td>
                        <span className={`badge ${r.success ? 'badge-paid' : 'badge-failed'}`}>
                          {r.success ? 'RESERVED' : 'OUT OF STOCK'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: r.success ? 'var(--green-dark)' : 'var(--red-dark)' }}>
                        {r.success ? `Order ${r.orderId} created successfully` : r.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StressTestPage;
