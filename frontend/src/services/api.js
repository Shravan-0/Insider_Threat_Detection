import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("inThreatToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("inThreatToken");
      localStorage.removeItem("inThreatUser");
      if (window.location.pathname !== "/") {
        window.location.reload();
      }
    }
    if (!error.response) {
      error.message = "Network error — unable to reach the API server.";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (payload) => api.post("/api/auth/login", payload).then((res) => res.data),
  me: () => api.get("/api/auth/me").then((res) => res.data),
  createUser: (payload) => api.post("/api/auth/users", payload).then((res) => res.data),
  listUsers: () => api.get("/api/auth/users").then((res) => res.data),
  resetPassword: (id, password) => api.patch(`/api/auth/users/${id}/password`, { password }).then((res) => res.data),
  updateUserStatus: (id, isActive) => api.patch(`/api/auth/users/${id}/status`, { isActive }).then((res) => res.data),
};

export const threatApi = {
  predictRisk: (records) => api.post("/api/predict-risk", records).then((res) => res.data),
  getLogs: (limit = 100) => api.get("/api/logs", { params: { limit } }).then((res) => res.data),
  getAlerts: (limit = 200) => api.get("/api/alerts", { params: { limit } }).then((res) => res.data),
  updateIncidentStatus: (id, status) => api.patch(`/api/alerts/${id}/status`, { status }).then((res) => res.data),
  addIncidentNote: (id, note) => api.post(`/api/alerts/${id}/notes`, { note }).then((res) => res.data),
  getEmployees: () => api.get("/api/employees").then((res) => res.data),
  getEmployeeSelf: () => api.get("/api/employees/me").then((res) => res.data),
  getDashboardStats: () => api.get("/api/dashboard/stats").then((res) => res.data),
  getTimeline: () => api.get("/api/intelligence/timeline").then((res) => res.data),
  getEmployeeIntelligence: (employeeId) => api.get(`/api/intelligence/employees/${employeeId}`).then((res) => res.data),
  getSocFeed: () => api.get("/api/intelligence/soc-feed").then((res) => res.data),
  getSystemStatus: () => api.get("/api/intelligence/system-status").then((res) => res.data),
};

export const configApi = {
  getConfig: () => api.get("/api/config").then((res) => res.data),
  updateConfig: (payload) => api.put("/api/config", payload).then((res) => res.data),
};

export const mlApi = {
  getStatus: () => api.get("/api/ml/status").then((res) => res.data),
  retrain: () => api.post("/api/ml/retrain").then((res) => res.data),
};

export default api;
