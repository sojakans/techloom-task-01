import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import StatusBadge from '../components/StatusBadge';

const ReservationsPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getOrders();
      setOrders(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeHolds = orders.filter((o) => o.status === 'RESERVED');
  const pastHolds = orders.filter((o) => o.status !== 'RESERVED').slice(0, 10);

  const totalHeldUnits = activeHolds.reduce(
    (sum, o) => sum + (o.items ? o.items.reduce((s, it) => s + it.quantity, 0) : 0),
    0
  );

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
              300s INACTIVITY ENGINE
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Background Cron: Every 15s</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            Reservations — Stock Hold Management
          </h1>
        </div>
        <button onClick={fetchReservations} className="btn btn-secondary btn-sm">
          🔄 Sync Hold Registry
        </button>
      </div>

      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {/* Explanatory Architecture Panel for 300s Inactivity Worker */}
      <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ⚙️ 300-Second Background Inactivity Worker Architecture
          </div>
          <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', padding: '0.2rem 0.6rem', borderRadius: 20, fontWeight: 700 }}>
            WORKER POLLING INTERVAL: 15 SECONDS
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '1rem' }}>
          To guarantee zero permanent inventory deadlocks, the NexusPOS backend runs a dedicated asynchronous worker (<code style={{ color: '#818cf8', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: 4 }}>expirationJob.js</code>). Every 15 seconds, the worker executes an atomic MongoDB transaction querying all orders where <code style={{ color: '#818cf8', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: 4 }}>status: 'RESERVED'</code> and <code style={{ color: '#818cf8', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: 4 }}>reservationExpiresAt &lt; Date.now()</code>. It automatically transitions expired orders to <code style={{ color: '#fcd34d' }}>EXPIRED</code> and atomically returns reserved quantities back to <code style={{ color: '#4ade80' }}>availableStock</code>.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Active Concurrent Holds:</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fcd34d' }}>{activeHolds.length} Orders</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Held Hardware Units:</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>{totalHeldUnits} Units</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Worker State:</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>RUNNING 🟢</div>
          </div>
        </div>
      </div>

      {/* Real-time Ledger of Active 5-Minute Locks */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="section-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              ⏳ Real-Time 5-Minute Stock Lock Ledger
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
              Active holds across POS Terminals, Web Registers, and Mobile Checkouts
            </div>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeHolds.length > 0 ? '#b45309' : '#16a34a' }}>
            {activeHolds.length} Active Hold{activeHolds.length === 1 ? '' : 's'}
          </span>
        </div>

        {activeHolds.length === 0 ? (
          <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
            <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🔒</div>
            <h3>No active reservations running</h3>
            <p style={{ fontSize: '0.85rem' }}>When a cashier or customer reaches checkout, an atomic 300s hold will appear here.</p>
            <Link to="/terminal" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
              Create Order in POS Terminal
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hold Identifier</th>
                  <th>Terminal / Register</th>
                  <th>Items Locked</th>
                  <th>Hold Value</th>
                  <th>Urgent Countdown</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeHolds.map((order) => {
                  const units = order.items?.reduce((s, it) => s + it.quantity, 0) || 0;
                  return (
                    <tr key={order.orderId}>
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#4f63ff' }}>
                          HLD-{order.orderId.slice(-6)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{order.orderId}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>POS Terminal 01</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Session: {order.sessionId?.substring(0, 10)}</div>
                      </td>
                      <td>
                        <strong>{units} units</strong> ({order.items?.length || 0} SKUs)
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        ${order.totalAmount?.toFixed(2)}
                      </td>
                      <td>
                        <CountdownTimer
                          expiresAt={order.reservationExpiresAt}
                          onExpire={fetchReservations}
                        />
                      </td>
                      <td>
                        <Link to={`/orders/${order.orderId}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                          Manage Hold →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Settled / Expired Holds */}
      <div className="card card-pad">
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <span className="section-title" style={{ fontSize: '1rem', fontWeight: 700 }}>
            📋 Past Hold Resolutions (Settled vs Auto-Purged)
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Terminal Session</th>
                <th>Total</th>
                <th>Resolution Status</th>
                <th>Outcome Description</th>
              </tr>
            </thead>
            <tbody>
              {pastHolds.map((o) => (
                <tr key={o.orderId}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.orderId}</td>
                  <td style={{ fontSize: '0.8rem' }}>{o.sessionId?.substring(0, 10)}</td>
                  <td style={{ fontWeight: 700 }}>${o.totalAmount?.toFixed(2)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                    {o.status === 'PAID'
                      ? 'Payment settled in time. Stock permanently deducted.'
                      : o.status === 'EXPIRED'
                      ? '300s TTL elapsed. Worker automatically restored ATS.'
                      : o.status === 'CANCELLED'
                      ? 'Cashier manual cancellation. Reserved units released.'
                      : 'Payment declined.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;
