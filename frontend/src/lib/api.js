import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  processGoogleSession: (sessionId) => api.post('/auth/session', { session_id: sessionId }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Orders API
export const ordersAPI = {
  create: (items) => api.post('/orders', items),
  getAll: () => api.get('/orders'),
};

// Top-up API
export const topupAPI = {
  redeem: (code) => api.post('/topup/redeem', null, { params: { code } }),
  getHistory: () => api.get('/topup/history'),
  getSettings: () => api.get('/topup/settings'),
  createRequest: (data) => api.post('/topup/request', data),
  getRequests: () => api.get('/topup/requests'),
};

// Rewards API
export const rewardsAPI = {
  getAll: () => api.get('/rewards'),
  claim: (level) => api.post(`/rewards/claim/${level}`),
};

// Wheel API
export const wheelAPI = {
  getPrizes: () => api.get('/wheel/prizes'),
  spin: () => api.post('/wheel/spin'),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  toggleAdmin: (userId, isAdmin) => api.put(`/admin/users/${userId}/admin`, null, { params: { is_admin: isAdmin } }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  updateUserBalance: (userId, balance) => api.put(`/admin/users/${userId}/balance`, null, { params: { balance } }),
  updateUserXP: (userId, xp) => api.put(`/admin/users/${userId}/xp`, null, { params: { xp } }),
  getTopupCodes: () => api.get('/admin/topup-codes'),
  createTopupCode: (data) => api.post('/admin/topup-codes', data),
  deleteTopupCode: (id) => api.delete(`/admin/topup-codes/${id}`),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (cardNumber, cardHolder, additionalInfo) => 
    api.put('/admin/settings', null, { params: { card_number: cardNumber, card_holder: cardHolder, additional_info: additionalInfo } }),
  getTopupRequests: () => api.get('/admin/topup-requests'),
  approveTopupRequest: (id) => api.put(`/admin/topup-requests/${id}/approve`),
  rejectTopupRequest: (id, note) => api.put(`/admin/topup-requests/${id}/reject`, null, { params: { note } }),
  createReward: (data) => api.post('/admin/rewards', data),
  deleteReward: (id) => api.delete(`/admin/rewards/${id}`),
  createWheelPrize: (data) => api.post('/admin/wheel-prizes', data),
  deleteWheelPrize: (id) => api.delete(`/admin/wheel-prizes/${id}`),
  getOrders: () => api.get('/admin/orders'),
};

// Seed API
export const seedAPI = {
  seed: () => api.post('/seed'),
};

export default api;
