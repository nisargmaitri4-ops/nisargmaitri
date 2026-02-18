// Centralized configuration for the application

// Get API URL - use relative URL in production for same-domain deployment
const getApiBaseUrl = () => {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production (Vercel), use relative URL since frontend and backend are on same domain
  if (import.meta.env.PROD) {
    return ''; // Empty string means relative URL
  }
  // Local development fallback
  return 'http://localhost:5001';
};

const config = {
  // API Configuration
  api: {
    baseUrl: getApiBaseUrl(),
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // App Configuration
  app: {
    name: 'Nisargmaitri',
    version: '1.0.0',
    environment: import.meta.env.MODE || 'development',
  },

  // Payment Configuration
  payment: {
    razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  },

  // Shipping Configuration
  shipping: {
    freeShippingThreshold: 500,
    standardShippingCost: 50,
  },
};

export default config;
