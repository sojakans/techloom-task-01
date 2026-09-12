/**
 * API client module for REST endpoints
 */

const getSessionId = () => {
  let sessionId = localStorage.getItem('pos_session_id');
  if (!sessionId) {
    sessionId = `SES-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    localStorage.setItem('pos_session_id', sessionId);
  }
  return sessionId;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const request = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.errors = data.errors || [];
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      console.error('Network/Server connection error:', error);
      error.message = 'Unable to connect to server. Ensure backend is running on port 5000.';
    }
    throw error;
  }
};

export const api = {
  getSessionId,

  // Health
  checkHealth: () => request('/api/health'),

  // Products
  getProducts: () => request('/api/products'),
  getProduct: (id) => request(`/api/products/${id}`),
  createProduct: (data) => request('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
  getProductStock: (id) => request(`/api/products/${id}/stock`),
  seedProducts: () => request('/api/products/seed', { method: 'POST' }),

  // Cart
  getCart: (sessionId = getSessionId()) => request(`/api/cart/${sessionId}`),
  addToCart: (productId, quantity, sessionId = getSessionId()) =>
    request('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ sessionId, productId, quantity }),
    }),
  removeFromCart: (productId, sessionId = getSessionId()) =>
    request(`/api/cart/items/${productId}?sessionId=${sessionId}`, { method: 'DELETE' }),
  clearCart: (sessionId = getSessionId()) =>
    request(`/api/cart/${sessionId}`, { method: 'DELETE' }),

  // Orders
  checkout: (cartId, sessionId = getSessionId()) =>
    request('/api/orders/checkout', {
      method: 'POST',
      body: JSON.stringify({ sessionId, cartId }),
    }),
  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/orders${query ? `?${query}` : ''}`);
  },
  getOrder: (orderId) => request(`/api/orders/${orderId}`),
  cancelOrder: (orderId) => request(`/api/orders/${orderId}/cancel`, { method: 'POST' }),
  getOrderStats: () => request('/api/orders/stats'),

  // Payments
  processPayment: (payload) =>
    request('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Simulations
  runStressTest: (config) =>
    request('/api/simulations/stress-test', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  resetTestData: () => request('/api/simulations/reset', { method: 'POST' }),
};

export default api;
