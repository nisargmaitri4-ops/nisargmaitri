import apiClient from './api';

// Contact Service - handles contact form API calls
const contactService = {
  // Submit contact form
  submitContactForm: async (formData) => {
    const response = await apiClient.post('/api/contact', {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone?.trim() || undefined,
      subject: formData.subject?.trim() || undefined,
      message: formData.message.trim(),
    });
    return response.data;
  },
};

export default contactService;
