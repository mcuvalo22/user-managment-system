import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (username, password) => 
  api.post('/auth/login', { username, password });
export const getCurrentUser = () => api.get('/auth/me');

export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (userId, data) => api.put(`/users/${userId}`, data);
export const getUserPermissions = (userId) => api.get(`/users/${userId}/permissions`);

export const getVehicles = () => api.get('/vehicles');
export const createVehicle = (data) => api.post('/vehicles', data);

export const getWorkOrders = () => api.get('/work-orders');
export const getWorkOrder = (id) => api.get(`/work-orders/${id}`);
export const createWorkOrder = (data) => api.post('/work-orders', data);
export const updateWorkOrderStatus = (orderId, status) =>
  api.put(`/work-orders/${orderId}/status`, { status });
export const assignMechanic = (orderId, mechanicId) =>
  api.put(`/work-orders/${orderId}/mechanic`, { mechanic_id: mechanicId });
export const addWorkLog = (orderId, data) =>
  api.post(`/work-orders/${orderId}/logs`, data);

export const getInvoices = () => api.get('/invoices');
export const markInvoicePaid = (invoiceId) => api.put(`/invoices/${invoiceId}/pay`);

export const getAuditLog = (params) => api.get('/audit-log', { params });

export const getSessions = () => api.get('/sessions');
export const deleteSession = (sessionId) => api.delete(`/sessions/${sessionId}`);

export const getRoles = () => api.get('/roles');

export const getDashboardStats = () => api.get('/stats/dashboard');
export const getCustomerDashboard = () => api.get('/stats/customer-dashboard');
export const getMechanicDashboard = () => api.get('/stats/mechanic-dashboard');

export const getMechanics = () => api.get('/mechanics');
export const getCustomers = () => api.get('/customers');

export default api;