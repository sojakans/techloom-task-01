import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], cartId: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(api.getSessionId());
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.id === toast?.id ? null : prev));
    }, 4000);
  };

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCart(sessionId);
      setCart(res.data);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const res = await api.addToCart(productId, quantity, sessionId);
      setCart(res.data);
      showToast('Item updated in cart', 'success');
      return res.data;
    } catch (err) {
      showToast(err.message, 'danger');
      throw err;
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const res = await api.removeFromCart(productId, sessionId);
      setCart(res.data);
      showToast('Item removed from cart', 'info');
      return res.data;
    } catch (err) {
      showToast(err.message, 'danger');
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      const res = await api.clearCart(sessionId);
      setCart(res.data);
      showToast('Cart cleared', 'info');
      return res.data;
    } catch (err) {
      showToast(err.message, 'danger');
      throw err;
    }
  };

  const resetSession = () => {
    const newSessionId = `SES-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    localStorage.setItem('pos_session_id', newSessionId);
    setSessionId(newSessionId);
    showToast(`Switched to new session: ${newSessionId}`, 'info');
  };

  const totalItems = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const totalPrice = cart.items ? cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        sessionId,
        totalItems,
        totalPrice,
        addToCart,
        removeFromCart,
        clearCart,
        fetchCart,
        resetSession,
        toast,
        showToast,
        setToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
