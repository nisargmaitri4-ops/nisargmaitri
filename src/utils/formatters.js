// Date formatting utility
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date)) return 'Invalid Date';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  
  return date.toLocaleDateString('en-IN', defaultOptions);
};

// Format currency (Indian Rupees)
export const formatCurrency = (amount) => {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

// Format order ID
export const formatOrderId = (orderId) => {
  return orderId?.toUpperCase() || 'N/A';
};
