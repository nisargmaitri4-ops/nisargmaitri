// Input sanitization to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  const div = document.createElement('div');
  div.textContent = input.trim();
  return div.innerHTML;
};

// Email validation
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Phone validation (10 digits)
export const isValidPhone = (phone) => {
  return /^[0-9]{10}$/.test(phone);
};

// Pincode validation (6 digits)
export const isValidPincode = (pincode) => {
  return /^[0-9]{6}$/.test(pincode);
};

// GST Number validation
export const isValidGST = (gst) => {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
};
