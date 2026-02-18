import apiClient, { withRetry } from './api';
import config from '../config';

// Order Service - handles all order related API calls
const orderService = {
  // Create a new order
  createOrder: async (orderData) => {
    const response = await withRetry(() => apiClient.post('/api/orders', orderData));
    return response.data;
  },

  // Get all orders (admin only)
  getOrders: async (params = {}) => {
    const response = await withRetry(() => apiClient.get('/api/orders', { params }));
    return response.data;
  },

  // Get order by ID
  getOrderById: async (orderId) => {
    const response = await apiClient.get(`/api/orders/${orderId}`);
    return response.data;
  },

  // Update order status (admin only)
  updateOrderStatus: async (orderId, status) => {
    const response = await apiClient.put(`/api/orders/${orderId}/status`, { status });
    return response.data;
  },

  // Create Razorpay order
  createRazorpayOrder: async (amount, orderId) => {
    const response = await withRetry(() =>
      apiClient.post('/api/orders/create-razorpay-order', { amount, orderId })
    );
    return response.data;
  },

  // Verify Razorpay payment
  verifyPayment: async (paymentData) => {
    const response = await apiClient.post('/api/orders/verify-payment', paymentData);
    return response.data;
  },

  // Calculate shipping cost
  calculateShipping: (subtotal) => {
    if (subtotal >= config.shipping.freeShippingThreshold) return 0;
    return config.shipping.standardShippingCost;
  },

  // Get SSE connection URL for order updates
  getOrderUpdatesUrl: (token) => {
    return `${config.api.baseUrl}/api/order-updates?token=${token}`;
  },
};

export default orderService;
