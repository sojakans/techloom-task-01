import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PaymentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (orderId) {
      navigate(`/checkout?orderId=${orderId}`, { replace: true });
    } else {
      navigate('/checkout', { replace: true });
    }
  }, [orderId, navigate]);

  return (
    <div className="page-body">
      <div className="center-loading">
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <p>Redirecting to Checkout & Reservation Terminal...</p>
      </div>
    </div>
  );
};

export default PaymentPage;
