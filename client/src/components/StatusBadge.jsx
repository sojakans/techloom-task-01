import React from 'react';

const STATUS_MAP = {
  PENDING:   { label: 'Pending',   cls: 'badge-pending' },
  RESERVED:  { label: 'Reserved',  cls: 'badge-reserved' },
  PAID:      { label: 'Paid',      cls: 'badge-paid' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-cancelled' },
  EXPIRED:   { label: 'Expired',   cls: 'badge-expired' },
  FAILED:    { label: 'Failed',    cls: 'badge-failed' },
  SUCCESS:   { label: 'Success',   cls: 'badge-success' },
  FAILURE:   { label: 'Failed',    cls: 'badge-failed' },
  TIMEOUT:   { label: 'Timeout',   cls: 'badge-expired' },
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const s = STATUS_MAP[status?.toUpperCase()] || { label: status, cls: 'badge-cancelled' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
};

export default StatusBadge;
