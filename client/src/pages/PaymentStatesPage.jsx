import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const PaymentStatesPage = () => {
  const [activeTab, setActiveTab] = useState('ALL');

  const outcomeStates = [
    {
      id: 'SUCCESS',
      status: 'Payment Successful',
      code: 'HTTP 200 OK',
      badgeClass: 'in-stock',
      color: '#16a34a',
      bg: '#dcfce7',
      borderColor: '#86efac',
      icon: '✅',
      headline: 'Permanent Inventory Settlement & Invoice Creation',
      description:
        'When payment gateway returns confirmation, MongoDB atomically deducts physical stock from the inventory collection. The 5-minute reservation lock is cleared, and an idempotent payment receipt is generated.',
      inventoryAction: 'Permanent Deduction: Stock moved from Reserved → Sold (Physical Stock decreased)',
      customerExperience: 'Cash drawer opens, receipt prints, order invoice sent via SMS/Email.',
      rollbackTrigger: 'None. Transaction is finalized and immutable.',
      apiPayload: {
        orderId: 'ORD-89214',
        paymentStatus: 'SUCCESS',
        transactionId: 'TXN-90219842',
        stockSettled: true,
        httpCode: 200,
      },
    },
    {
      id: 'FAILURE',
      status: 'Payment Failed / Declined',
      code: 'HTTP 402 Payment Required',
      badgeClass: 'out-of-stock',
      color: '#dc2626',
      bg: '#fee2e2',
      borderColor: '#fca5a5',
      icon: '❌',
      headline: 'Immediate Automatic Rollback of Reserved Stock',
      description:
        'If a card is declined (insufficient funds, invalid CVC, expired card), the server immediately executes an atomic compensation transaction, transferring held units from Reserved Stock back into Available to Sell (ATS).',
      inventoryAction: 'Immediate Rollback: Reserved Stock decremented, ATS restored instantly.',
      customerExperience: 'Terminal displays "Card Declined - Reason: Insufficient Funds". Prompt to retry or change payment method.',
      rollbackTrigger: 'Immediate on HTTP 402 response. No stock left dangling in limbo.',
      apiPayload: {
        orderId: 'ORD-89215',
        paymentStatus: 'FAILED',
        errorCode: 'CARD_DECLINED_INSUFFICIENT_FUNDS',
        stockRolledBack: true,
        httpCode: 402,
      },
    },
    {
      id: 'TIMEOUT',
      status: 'Payment Gateway Timeout',
      code: 'HTTP 408 Request Timeout',
      badgeClass: 'low-stock',
      color: '#d97706',
      bg: '#fef3c7',
      borderColor: '#fcd34d',
      icon: '⏳',
      headline: 'Graceful Degradation with 300s TTL Purge',
      description:
        'If network connectivity drops or the payment gateway takes longer than 15s to respond, the transaction is flagged as PENDING_GATEWAY. If not verified within the 300-second reservation window, the background worker automatically releases the lock.',
      inventoryAction: 'Delayed Safe Rollback: Stock kept safe until 300s TTL or manual cancellation.',
      customerExperience: 'Terminal offers "Retry Authorization" or "Pay with Cash". If customer walks away, cart is restored.',
      rollbackTrigger: 'Automatic at T = 300s via background expiration worker.',
      apiPayload: {
        orderId: 'ORD-89216',
        paymentStatus: 'TIMEOUT',
        errorCode: 'GATEWAY_UPSTREAM_TIMEOUT',
        autoPurgeTTL: '300s',
        httpCode: 408,
      },
    },
  ];

  const hardwareTelemetry = [
    { name: 'POS Cash Drawer', interface: 'RJ12 / ESC-POS', status: 'ONLINE', latency: '2ms', icon: '💵' },
    { name: 'Honeywell Barcode Scanner', interface: 'USB HID / OPOS', status: 'CONNECTED', latency: '<1ms', icon: '🔍' },
    { name: 'Thermal Receipt Printer', interface: 'Ethernet 10/100', status: 'READY (Paper 88%)', latency: '4ms', icon: '🧾' },
    { name: 'Verifone P400 Card Terminal', interface: 'TLS 1.3 / EMV Level 3', status: 'AUTHENTICATED', latency: '18ms', icon: '💳' },
    { name: 'MQTT Hardware Ledger Broker', interface: 'tcp://broker:1883', status: 'CONNECTED', latency: '12ms', icon: '📡' },
  ];

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
              SYSTEM ARCHITECTURE SPECIFICATION
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Deterministic Finite State Verification</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            Payment Results & System States Showcase
          </h1>
        </div>
        <Link to="/checkout" className="btn btn-primary btn-sm">
          Go to Checkout Simulator →
        </Link>
      </div>

      {/* Authoritative Side-by-Side 3-State View */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            Core Outcome States & Stock Resolution Matrix
          </h2>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['ALL', 'SUCCESS', 'FAILURE', 'TIMEOUT'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {outcomeStates
            .filter((s) => activeTab === 'ALL' || activeTab === s.id)
            .map((state) => (
              <div
                key={state.id}
                className="card"
                style={{
                  border: `2px solid ${state.borderColor}`,
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow)',
                }}
              >
                {/* Card Header */}
                <div style={{ background: state.bg, padding: '1rem', borderBottom: `1px solid ${state.borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{state.icon}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', background: '#ffffff', color: state.color, padding: '0.15rem 0.45rem', borderRadius: 4, border: `1px solid ${state.borderColor}` }}>
                      {state.code}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: state.color, margin: 0 }}>
                    {state.status}
                  </h3>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>
                      {state.headline}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', lineHeight: '1.5' }}>
                      {state.description}
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                    <strong style={{ color: 'var(--gray-900)' }}>📦 Stock Resolution:</strong>
                    <div style={{ color: 'var(--gray-700)', marginTop: '0.15rem' }}>{state.inventoryAction}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                    <strong style={{ color: 'var(--gray-900)' }}>👤 Customer Experience:</strong>
                    <div style={{ color: 'var(--gray-700)', marginTop: '0.15rem' }}>{state.customerExperience}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                    <strong style={{ color: 'var(--gray-900)' }}>🔄 Rollback Mechanics:</strong>
                    <div style={{ color: 'var(--gray-700)', marginTop: '0.15rem' }}>{state.rollbackTrigger}</div>
                  </div>

                  {/* Mock Payload Snippet */}
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Telemetry Payload Structure:
                    </div>
                    <pre style={{ background: '#0f172a', color: '#a5b4fc', padding: '0.65rem', borderRadius: 6, fontSize: '0.72rem', overflowX: 'auto', fontFamily: 'monospace' }}>
                      {JSON.stringify(state.apiPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Hardware Telemetry & MQTT Ledger Protocol Statuses */}
      <div className="card card-pad">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="section-title" style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📡 Hardware Telemetry & MQTT Protocol Gateway
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
              Sub-second peripheral synchronization for offline-first store registers
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: 20, fontWeight: 700 }}>
            ALL SUBSYSTEMS NOMINAL
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Peripheral / Service</th>
                <th>Interface Protocol</th>
                <th>Status</th>
                <th>Ping Latency</th>
                <th>Health Signal</th>
              </tr>
            </thead>
            <tbody>
              {hardwareTelemetry.map((item) => (
                <tr key={item.name}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                      <strong style={{ fontSize: '0.85rem' }}>{item.name}</strong>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>
                    {item.interface}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#16a34a', padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>
                    {item.latency}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="status-dot online" style={{ width: 8, height: 8 }} />
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Heartbeat OK</span>
                    </div>
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

export default PaymentStatesPage;
