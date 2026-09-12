import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ expiresAt, onExpire, status }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt || status !== 'RESERVED') { setTimeLeft(0); return; }
    const calc = () => {
      const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0 && onExpire) onExpire();
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status, onExpire]);

  if (status !== 'RESERVED' || !expiresAt) return null;

  const seconds = Math.floor((timeLeft / 1000) % 60);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const isUrgent = timeLeft < 60000;
  const isWarn = timeLeft < 120000 && !isUrgent;

  return (
    <span className={`countdown ${isUrgent ? 'urgent' : isWarn ? 'warn' : 'normal'}`}>
      ⏱️ {minutes}:{seconds.toString().padStart(2, '0')} left
    </span>
  );
};

export default CountdownTimer;
