import api from "../lib/axios"; // Adjust path to import your base interceptor instance

// ==========================================
// 👤 AUTHENTICATION ENDPOINTS
// ==========================================
export const login = async (credentials) => {
  // POSTS to https://xcombinator.onrender.com/api/auth/login
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

export const register = async (userData) => {
  // POSTS to https://xcombinator.onrender.com/api/auth/register
  const response = await api.post("/auth/register", userData);
  return response.data;
};

// ==========================================
// 💰 USER & FINANCE ENDPOINTS
// ==========================================
export const getUserBalance = async () => {
  // GETS from https://xcombinator.onrender.com/api/users/balance
  const response = await api.get("/users/balance");
  return response.data;
};

export const getTransactionHistory = async () => {
  // GETS from https://xcombinator.onrender.com/api/finance/transactions
  const response = await api.get("/finance/transactions");
  return response.data;
};

export const submitPaymentReceipt = async (paymentData) => {
  // POSTS to https://xcombinator.onrender.com/api/finance/submit-payment
  const response = await api.post("/finance/submit-payment", paymentData);
  return response.data;
};

// ==========================================
// ⚡ IDENTITY VERIFICATION ENDPOINTS (NIN)
// ==========================================
export const triggerInstantVerify = async (payload) => {
  // POSTS to https://xcombinator.onrender.com/api/services/verify
  const response = await api.post("/services/verify", payload);
  return response.data;
};

export const submitManualNInRequest = async (payload) => {
  // POSTS to https://xcombinator.onrender.com/api/services/request
  const response = await api.post("/services/request", payload);
  return response.data;
};

// ==========================================
// 🏢 CORPORATE AFFAIRS COMMISSION (CAC) ENDPOINTS
// ==========================================
export const submitCacFiling = async (cacData) => {
  // POSTS to https://xcombinator.onrender.com/api/cac/submit
  const response = await api.post("/cac/submit", cacData);
  return response.data;
};

export const getCacFilingHistory = async () => {
  // GETS from https://xcombinator.onrender.com/api/cac/history
  const response = await api.get("/cac/history");
  return response.data;
};

// ==========================================
// 🛠️ ADMIN CONTROL PIPELINES
// ==========================================
export const adminGetPendingPayments = async () => {
  const response = await api.get("/finance/admin/payments");
  return response.data;
};

export const adminApprovePayment = async (transactionId) => {
  const response = await api.post(`/finance/admin/payments/${transactionId}/approve`);
  return response.data;
};

export const adminRejectPayment = async (transactionId) => {
  const response = await api.post(`/finance/admin/payments/${transactionId}/reject`);
  return response.data;
};

export const adminGetIdentityRequests = async () => {
  const response = await api.get("/services/admin/requests");
  return response.data;
};

export const adminGetCacRequests = async () => {
  const response = await api.get("/cac/admin/requests");
  return response.data;
};