import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Phase 2: send httpOnly cookies with every request
});

// ── Request Interceptor ───────────────────────────────────────────────────
// Attach JWT Bearer token as fallback (registered users still use localStorage)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ht_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response Interceptor with Auto-Refresh ────────────────────────────────
// On 401: try refresh token rotation before redirecting to login
let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve();
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If currently refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try refresh token rotation (cookie-based)
        const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, {}, {
          withCredentials: true,
        });

        // Update localStorage with new access token
        if (data.access_token) {
          localStorage.setItem('ht_token', data.access_token);
        }

        processQueue(null);
        isRefreshing = false;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        // Refresh failed — clear auth and redirect
        const isGuest = localStorage.getItem('ht_guest') === 'true';
        if (!isGuest) {
          localStorage.removeItem('ht_token');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Rate limit error — pass through with readable message
    if (error.response?.status === 429) {
      const detail = error.response?.data?.detail || 'Too many requests. Please wait.';
      error.friendlyMessage = detail;
    }

    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    return data;
  },
  register: async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    return data;
  },
  me: async () => {
    const { data } = await api.get('/api/auth/me');
    return data;
  },
  forgotPassword: async (email) => {
    const { data } = await api.post('/api/auth/forgot-password', { email });
    return data;
  },
  resetPassword: async (token, newPassword) => {
    const { data } = await api.post('/api/auth/reset-password', { token, new_password: newPassword });
    return data;
  },
  verifyEmail: async (email, code) => {
    const { data } = await api.post('/api/auth/verify-email', { email, code });
    return data;
  },
  sendCode: async (email) => {
    const { data } = await api.post('/api/auth/send-code', { email });
    return data;
  },
  guestToken: async () => {
    const { data } = await api.post('/api/auth/guest-token');
    return data;
  },
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {}
    localStorage.removeItem('ht_token');
    localStorage.removeItem('ht_guest');
  },
};

// ── Cases ─────────────────────────────────────────────────────────────────
export async function createCase(caseData) {
  const { data } = await api.post('/api/cases', caseData);
  return data;
}

export async function listCases(skip = 0, limit = 20) {
  const { data } = await api.get('/api/cases', { params: { skip, limit } });
  return data;
}

export async function getCase(caseId) {
  const { data } = await api.get(`/api/cases/${caseId}`);
  return data;
}

export async function rerunCase(caseId) {
  const { data } = await api.post(`/api/cases/${caseId}/run`);
  return data;
}

// ── Admin ──────────────────────────────────────────────────────────────────
export async function getAdminStats() {
  const { data } = await api.get('/api/admin/stats');
  return data;
}

export async function getAuditLogs(limit = 50) {
  const { data } = await api.get('/api/admin/logs', { params: { limit } });
  return data;
}

export async function getAdminUsers() {
  const { data } = await api.get('/api/admin/users');
  return data;
}

export async function getPendingUsers() {
  const { data } = await api.get('/api/admin/users/pending');
  return data;
}

export async function approveUser(username) {
  const { data } = await api.post(`/api/admin/users/${username}/approve`);
  return data;
}

export async function rejectUser(username) {
  const { data } = await api.post(`/api/admin/users/${username}/reject`);
  return data;
}

export async function changeUserRole(username, role) {
  const { data } = await api.put(`/api/admin/users/${username}/role`, { role });
  return data;
}

export async function banUser(username) {
  const { data } = await api.post(`/api/admin/users/${username}/ban`);
  return data;
}

export async function getUserDetail(username) {
  const { data } = await api.get(`/api/admin/users/${username}`);
  return data;
}

export async function getSystemHealth() {
  const { data } = await api.get('/api/admin/system-health');
  return data;
}

export async function getDatabaseTables() {
  const { data } = await api.get('/api/admin/database/tables');
  return data;
}

export async function getDatabaseSummary() {
  const { data } = await api.get('/api/admin/database/summary');
  return data;
}

export async function getTableData(tableName, skip = 0, limit = 50, search = '') {
  const params = { skip, limit };
  if (search) params.search = search;
  const { data } = await api.get(`/api/admin/database/table/${tableName}`, { params });
  return data;
}

export async function getAdminCases(skip = 0, limit = 50, status = '') {
  const params = { skip, limit };
  if (status) params.status = status;
  const { data } = await api.get('/api/admin/cases', { params });
  return data;
}

export async function getAdminCaseDetail(caseId) {
  const { data } = await api.get(`/api/admin/cases/${caseId}`);
  return data;
}

export async function deleteAdminCase(caseId) {
  const { data } = await api.delete(`/api/admin/cases/${caseId}`);
  return data;
}

export async function getAgentPatterns(agentName = '', patternType = '', skip = 0, limit = 50) {
  const params = { skip, limit };
  if (agentName) params.agent_name = agentName;
  if (patternType) params.pattern_type = patternType;
  const { data } = await api.get('/api/admin/agent-patterns', { params });
  return data;
}

export async function getAgentStats() {
  const { data } = await api.get('/api/admin/agent-stats');
  return data;
}

export async function getAllPredictions(skip = 0, limit = 50) {
  const { data } = await api.get('/api/admin/predictions', { params: { skip, limit } });
  return data;
}

export async function getAllFeedback(skip = 0, limit = 50) {
  const { data } = await api.get('/api/admin/feedback', { params: { skip, limit } });
  return data;
}

export async function getDRSAnalytics() {
  const { data } = await api.get('/api/admin/drs-analytics');
  return data;
}

export async function getAllHealthMetrics(skip = 0, limit = 100) {
  const { data } = await api.get('/api/admin/health-metrics-all', { params: { skip, limit } });
  return data;
}

export async function getAllAppointments(skip = 0, limit = 100) {
  const { data } = await api.get('/api/admin/appointments-all', { params: { skip, limit } });
  return data;
}

export async function getAllPrescriptions(skip = 0, limit = 100) {
  const { data } = await api.get('/api/admin/prescriptions-all', { params: { skip, limit } });
  return data;
}

export async function getAllNotifications(skip = 0, limit = 100) {
  const { data } = await api.get('/api/admin/notifications-all', { params: { skip, limit } });
  return data;
}

export async function getAllChatMessages(skip = 0, limit = 100) {
  const { data } = await api.get('/api/admin/chat-messages-all', { params: { skip, limit } });
  return data;
}

export async function getAllMedicalRecords(skip = 0, limit = 100) {
  const { data } = await api.get('/api/admin/medical-records-all', { params: { skip, limit } });
  return data;
}

export async function getAllDepartments() {
  const { data } = await api.get('/api/admin/departments-all');
  return data;
}

// ── Patient ────────────────────────────────────────────────────────────────
export const patientAPI = {
  getAppointments: async () => {
    const { data } = await api.get('/api/patient/appointments');
    return data;
  },
  getHealthMetrics: async () => {
    const { data } = await api.get('/api/patient/health-metrics');
    return data;
  },
  logHealthMetric: async (metricType, value, unit = '') => {
    const { data } = await api.post('/api/patient/health-metrics', { metric_type: metricType, value, unit });
    return data;
  },
  getMedicalRecords: async () => {
    const { data } = await api.get('/api/patient/medical-records');
    return data;
  },
  getPrescriptions: async () => {
    const { data } = await api.get('/api/patient/prescriptions');
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get('/api/patient/profile');
    return data;
  },
  updateProfile: async (profileData) => {
    const { data } = await api.put('/api/patient/profile', profileData);
    return data;
  },
};

// ── Doctor ─────────────────────────────────────────────────────────────────
export const doctorAPI = {
  getPatients: async () => {
    const { data } = await api.get('/api/doctor/patients');
    return data;
  },
  getAppointments: async () => {
    const { data } = await api.get('/api/doctor/appointments');
    return data;
  },
  createAppointment: async (apptData) => {
    const { data } = await api.post('/api/doctor/appointments', apptData);
    return data;
  },
  getPrescriptions: async () => {
    const { data } = await api.get('/api/doctor/prescriptions');
    return data;
  },
  createPrescription: async (rxData) => {
    const { data } = await api.post('/api/doctor/prescriptions', rxData);
    return data;
  },
  getMedicalRecords: async () => {
    const { data } = await api.get('/api/doctor/medical-records');
    return data;
  },
  createMedicalRecord: async (recordData) => {
    const { data } = await api.post('/api/doctor/medical-records', recordData);
    return data;
  },
  getCases: async () => {
    const { data } = await api.get('/api/doctor/cases');
    return data;
  },
  getStats: async () => {
    const { data } = await api.get('/api/doctor/stats');
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get('/api/doctor/profile');
    return data;
  },
};

// ── Cases (shared) ─────────────────────────────────────────────────────────
export const casesAPI = {
  delete: async (caseId) => {
    const { data } = await api.delete(`/api/cases/${caseId}`);
    return data;
  },
};

// ── Multimodal / Attachments ──────────────────────────────────────────────
export const multimodalAPI = {
  uploadImage: async (caseId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/api/multimodal/cases/${caseId}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data;
  },

  uploadAttachments: async (caseId, files, attachmentType = 'other') => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('attachment_type', attachmentType);
    const { data } = await api.post(`/api/multimodal/cases/${caseId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    });
    return data;
  },

  listAttachments: async (caseId, attachmentType = '') => {
    const params = {};
    if (attachmentType) params.attachment_type = attachmentType;
    const { data } = await api.get(`/api/multimodal/cases/${caseId}/attachments`, { params });
    return data;
  },

  getAttachment: async (attachmentId) => {
    const { data } = await api.get(`/api/multimodal/attachments/${attachmentId}`);
    return data;
  },

  getAttachmentUrl: (attachmentId) => {
    const token = localStorage.getItem('ht_token');
    const base = import.meta.env.VITE_API_BASE_URL || '';
    return `${base}/api/multimodal/attachments/${attachmentId}/file?token=${token}`;
  },

  deleteAttachment: async (attachmentId) => {
    const { data } = await api.delete(`/api/multimodal/attachments/${attachmentId}`);
    return data;
  },
};

// ── Health Analysis ────────────────────────────────────────────────────────
export const healthAnalysisAPI = {
  getSupportedTypes: async () => {
    const { data } = await api.get('/api/health/supported-types');
    return data;
  },

  analyze: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/api/health/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,  // 2 minutes for AI analysis
    });
    return data;
  },

  getAnalyses: async (skip = 0, limit = 20) => {
    const { data } = await api.get('/api/health/analyses', { params: { skip, limit } });
    return data;
  },

  getAnalysis: async (analysisId) => {
    const { data } = await api.get(`/api/health/analyses/${analysisId}`);
    return data;
  },

  getFileUrl: (analysisId) => {
    const token = localStorage.getItem('ht_token');
    const base = import.meta.env.VITE_API_BASE_URL || '';
    return `${base}/api/health/analyses/${analysisId}/file?token=${token}`;
  },

  deleteAnalysis: async (analysisId) => {
    const { data } = await api.delete(`/api/health/analyses/${analysisId}`);
    return data;
  },
};

// ── Notifications ──────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: async () => {
    const { data } = await api.get('/api/notifications');
    return data;
  },
  markRead: async (id) => {
    const { data } = await api.post(`/api/notifications/${id}/read`);
    return data;
  },
  markAllRead: async () => {
    const { data } = await api.post('/api/notifications/read-all');
    return data;
  },
};

// ── Messages ───────────────────────────────────────────────────────────────
export const messagesAPI = {
  getAll: async () => {
    const { data } = await api.get('/api/messages');
    return data;
  },
  getConversations: async () => {
    const { data } = await api.get('/api/messages/conversations');
    return data;
  },
  getConversation: async (contactId) => {
    const { data } = await api.get(`/api/messages/${contactId}`);
    return data;
  },
  send: async (receiverId, content) => {
    const { data } = await api.post(`/api/messages/${receiverId}`, { content });
    return data;
  },
};

// ── Departments ────────────────────────────────────────────────────────────
export const departmentsAPI = {
  getAll: async () => {
    const { data } = await api.get('/api/departments');
    return data;
  },
};

// ── Clinical ──────────────────────────────────────────────────────────────
export const clinicalAPI = {
  getNotes: async () => {
    const { data } = await api.get('/api/clinical/notes');
    return data;
  },
  createNote: async (noteData) => {
    const { data } = await api.post('/api/clinical/notes', noteData);
    return data;
  },
  getLabOrders: async () => {
    const { data } = await api.get('/api/clinical/lab-orders');
    return data;
  },
  createLabOrder: async (orderData) => {
    const { data } = await api.post('/api/clinical/lab-orders', orderData);
    return data;
  },
  updateLabOrderStatus: async (orderId) => {
    const { data } = await api.put(`/api/clinical/lab-orders/${orderId}`);
    return data;
  },
  getBilling: async () => {
    const { data } = await api.get('/api/clinical/billing');
    return data;
  },
};

// ── WebSocket ──────────────────────────────────────────────────────────────
export function createCaseWebSocket(caseId, token, onEvent) {
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/case/${caseId}?token=${token}`;
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => onEvent({ type: 'connected' });
  ws.onmessage = (e) => { try { onEvent(JSON.parse(e.data)); } catch {} };
  ws.onerror = () => onEvent({ type: 'error', message: 'WebSocket error' });
  ws.onclose = (e) => onEvent({ type: 'disconnected', code: e.code });
  const ping = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' })); }, 30000);
  return {
    close: () => { clearInterval(ping); ws.close(); },
    send: (d) => { if (ws.readyState === 1) ws.send(JSON.stringify(d)); },
  };
}

export default api;
