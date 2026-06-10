import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Clears all auth data from localStorage and redirects to the login page
const clearAuthAndRedirect = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('persist:root');
  window.location.href = '/login';
};

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/accounts/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 422) {
      const detail = error.response?.data?.detail || 'Prerequisite steps are not complete.';
      toast.error(detail, { duration: 6000 });
    }

    if (error.response?.status === 429) {
      const detail = error.response?.data?.detail || 'Too many concurrent jobs. Please wait for a running job to finish.';
      toast.error(detail, { duration: 6000 });
    }

    return Promise.reject(error);
  }
);

// API Helper functions for common operations
export const apiService = {
  // Auth endpoints
  login: (email, password) => api.post('/accounts/login', { email, password }),
  signup: (email, password, first_name, last_name) => 
    api.post('/accounts/signup', { email, password, first_name, last_name }),
  logout: () => api.post('/accounts/logout'),
  refreshToken: (refresh_token) => api.post('/accounts/refresh', { refresh_token }),
  getCurrentUser: () => api.get('/accounts/me'),
  updateUser: (data) => api.put('/accounts/me', data),
  deleteAccount: () => api.delete('/accounts/me'),
  verifyEmail: (data) => api.post('/accounts/verify-email', data),
  resendVerification: () => api.post('/accounts/resend-verification'),
  forgotPassword: (email) => api.post('/accounts/forgot-password', { email }),
  resetPassword: (token, new_password) => 
    api.post('/accounts/reset-password', { token, new_password }),
  changePassword: (old_password, new_password) => 
    api.post('/accounts/change-password', { old_password, new_password }),

  // SSH credentials endpoints
  saveSSHCredentials: (credentials) => api.post('/ssh/credentials', credentials),
  getSSHCredentials: () => api.get('/ssh/credentials'),
  deleteSSHCredentials: () => api.delete('/ssh/credentials'),
  testSSHConnection: (credentials) => api.post('/ssh/credentials/test', credentials),
  testStoredSSHCredentials: () => api.post('/ssh/credentials/test-stored'),
  uploadSSHKey: (formData) => api.post('/ssh/credentials/upload-key', formData),
  testSSHWithUploadedKey: (data) => api.post('/ssh/credentials/test-upload', data),

  // Project endpoints
  createProject: (data) => api.post('/analyze/projects', data),
  updateProject: (id, data) => api.put(`/analyze/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/analyze/projects/${id}`),
  getRecentProjects: () => api.get('/analyze/projects/recent'),
  getProjectStats: () => api.get('/analyze/projects/stats'),

  // Commercial-LLM API keys (stored encrypted per user; never returned in full)
  getLLMCredentials: () => api.get('/analyze/llm-credentials'),
  saveLLMCredentials: (provider, api_key) => api.post('/analyze/llm-credentials', { provider, api_key }),
  deleteLLMCredentials: (provider) => api.delete(`/analyze/llm-credentials/${provider}`),
  testLLMCredentials: (provider, api_key) => api.post('/analyze/llm-credentials/test', { provider, api_key: api_key || null }),
  // List chat models available to a key (validates the key as a side effect)
  getLLMModels: (provider, api_key) => api.post('/analyze/llm-credentials/models', { provider, api_key: api_key || null }),
  // Switch an existing project's LLM (validated server-side before saving)
  switchProjectLLM: (project_id, data) => api.put(`/analyze/projects/${project_id}/llm`, data),

  // Analysis endpoints
  testSSHForAnalysis: (data) => api.post('/analyze/test/ssh', data),
  runScan: (data) => api.post('/analyze/scan', data),
  runScanWithLLM: (data) => api.post('/analyze/scan/with-llm', data),
  runSonarQubeScan: (data) => api.post('/analyze/scan/sonarqube', data),
  analyzeProject: (data) => api.post('/analyze/scan/analyse-project', data),
  getReports: () => api.get('/analyze/reports'),
  downloadReport: (id) => api.get(`/analyze/reports/${id}/download`),
  viewReport: (id) => api.get(`/analyze/reports/${id}/view`),

  // SonarQube endpoints
  testSSHForSonarQube: (data) => api.post('/sonarqube/test/ssh', data),
  triggerRemoteScan: (data) => api.post('/sonarqube/scan/remote', data),
  triggerRemoteScanAsync: (data) => api.post('/sonarqube/scan/remote/async', data),
  getScanJobs: () => api.get('/sonarqube/scan/jobs'),
  getScanJobStatus: (job_id) => api.get(`/sonarqube/scan/jobs/${job_id}`),
  cancelScanJob: (job_id) => api.post(`/sonarqube/scan/jobs/${job_id}/cancel`),

  // Cancel any running migration / modernization job (Step 1 / 2 / 3 / 4).
  // Backend marks the job as cancelled; the worker stops between files. Already-uploaded
  // stage snapshots on the customer VM are preserved (not deleted).
  cancelJob: (job_id) => api.post(`/agents/jobs/${job_id}/cancel`),
  fetchSonarQubeReport: (data) => api.post('/sonarqube/reports/fetch', data),
  getProjectReport: (project_key) => api.get(`/sonarqube/reports/${project_key}`),
  getCachedReport: (project_key) => api.get(`/sonarqube/reports/${project_key}/cached`),
  invalidateReportCache: (project_key) => api.delete(`/sonarqube/reports/${project_key}/cache`),
  getCacheStats: () => api.get('/sonarqube/cache/stats'),

  // Agent endpoints - Individual steps
  structureAnalysis: (data) => api.post('/agents/structure-analysis', data),
  languageAnalysis: (data) => api.post('/agents/language-analysis', data),
  upgradeAnalysis: (data) => api.post('/agents/upgrade-analysis', data),
  codeModernization: (data) => api.post('/agents/code-modernization', data),

  // Agent endpoints - Transform workflow (Recommended)
  runStep1: (data) => api.post('/agents/run-structure-language-and-version-upgradation', data),
  runStep1Status: (job_id) => api.get(`/agents/run-structure-language-and-version-upgradation/status/${job_id}`),
  runStep2: (data) => api.post('/agents/run-upgrade-analysis-simple', data),
  runStep2Status: (job_id) => api.get(`/agents/run-upgrade-analysis/status/${job_id}`),
  runStep3: (data) => api.post('/agents/run-upgrade-analysis', data),
  runStep3Status: (job_id) => api.get(`/agents/run-upgrade-analysis/status/${job_id}`),
  runStep4: (data) => api.post('/agents/run-code-modernization', data),
  runStep4Status: (job_id) => api.get(`/agents/run-code-modernization/status/${job_id}`),
  getProjectModernizationResult: (projectName) => api.get(`/agents/projects/${encodeURIComponent(projectName)}/modernization-result`),
  // Pre-flight for migration Step 4: returns per-language file counts, env limits,
  // and estimated runtime + token cost. Shown to the user as a confirmation modal
  // before Step 4 actually starts.
  estimateMigration: (data) => api.post('/agents/migration/estimate', data),
  // Valid target-version ladder per language - feeds the version picker inside the estimate modal
  getMigrationVersionOptions: () => api.get('/agents/migration/version-options'),
  listTransforms: () => api.get('/agents/transforms'),
  // Soft-hide a migration from the recent list (jobs/results are preserved server-side)
  removeTransform: (transform_id) => api.delete(`/agents/transforms/${transform_id}`),
  // Before/after diff for one file of a modernization job; omit path for the file list
  getModernizationFileDiff: (job_id, path) =>
    api.get(`/agents/run-code-modernization/status/${job_id}/files`, { params: path ? { path } : {} }),
  securityTest: (data) => api.post('/agents/security-test', data),

  // Legacy endpoint - Full pipeline
  runModernization: (data) => api.post('/agents/run-modernization', data),
  runModernizationStatus: (job_id) => api.get(`/agents/run-modernization/status/${job_id}`),
  runModernizationLogs: (job_id) => api.get(`/agents/run-modernization/status/${job_id}/logs`),
  listModernizationJobs: () => api.get('/agents/run-modernization/jobs'),

  // Health check
  healthCheck: () => api.get('/health'),
};

export default api;

// Dev: Moshiur Rahman - 2026-06-10
