const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      // Clear token and broadcast logout if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    const error = new Error(data.error || 'An unexpected error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),

  // Users / Students
  getStudents: (params = '') => request(`/users?${params}`),
  getStudentDetail: (id) => request(`/users/${id}`),

  // Skills
  getCategories: () => request('/skills/categories'),
  getSkills: (params = '') => request(`/skills?${params}`),
  getMySkills: () => request('/skills/my-skills'),
  addMySkill: (body) => request('/skills/my-skills', { method: 'POST', body: JSON.stringify(body) }),
  updateMySkill: (id, body) => request(`/skills/my-skills/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMySkill: (id) => request(`/skills/my-skills/${id}`, { method: 'DELETE' }),

  // Matches
  getMatches: (limit = 20) => request(`/matches?limit=${limit}`),

  // Learning Requests
  getRequests: (type = 'all') => request(`/requests?type=${type}`),
  createRequest: (body) => request('/requests', { method: 'POST', body: JSON.stringify(body) }),
  updateRequestStatus: (id, status) => request(`/requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Sessions
  getSessions: (status = '') => request(`/sessions${status ? `?status=${status}` : ''}`),
  getSessionDetail: (id) => request(`/sessions/${id}`),
  scheduleSession: (body) => request('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  updateSessionStatus: (id, status) => request(`/sessions/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Reviews
  createReview: (body) => request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  getUserReviews: (userId) => request(`/reviews/user/${userId}`),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'PUT' }),

  // Payments
  getPaymentConfig: () => request('/payments/config'),
  createPaymentOrder: (sessionId) => request('/payments/create-order', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
  verifyPayment: (body) => request('/payments/verify', { method: 'POST', body: JSON.stringify(body) }),
  getTransactions: () => request('/payments/transactions'),
  getTransactionDetail: (id) => request(`/payments/transactions/${id}`),
  requestRefund: (body) => request('/payments/refund-request', { method: 'POST', body: JSON.stringify(body) }),

  // Reports
  submitReport: (body) => request('/reports', { method: 'POST', body: JSON.stringify(body) }),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: (params = '') => request(`/admin/users?${params}`),
  toggleUserStatus: (userId) => request(`/admin/users/${userId}/toggle-status`, { method: 'PUT' }),
  createCategory: (body) => request('/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  deleteCategory: (catId) => request(`/admin/categories/${catId}`, { method: 'DELETE' }),
  getAdminTransactions: (params = '') => request(`/admin/transactions?${params}`),
  getRefundRequests: () => request('/admin/refund-requests'),
  processRefund: (id, body) => request(`/admin/refund-requests/${id}/process`, { method: 'POST', body: JSON.stringify(body) }),
  getAdminReports: () => request('/reports'),
  resolveReport: (id, body) => request(`/reports/${id}/resolve`, { method: 'PUT', body: JSON.stringify(body) }),
};
