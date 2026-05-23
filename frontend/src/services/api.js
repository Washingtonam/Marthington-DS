importapi from "../lib/axios"; // Adjust path to import your base interceptor instance

// ==========================================
// 👤 AUTHENTICATION ENDPOINTS
// ==========================================
export const login = async (credentials) => {
  // POSTS to https://xcombinator.onrender.com/api/auth/login
  const response = awaitapi.post("/auth/login", credentials);
  return response.data;
};

export const register = async (userData) => {
  // POSTS to https://xcombinator.onrender.com/api/auth/register
  const response = awaitapi.post("/auth/register", userData);
  return response.data;
};

// ==========================================
// 💰 USER & FINANCE ENDPOINTS
// ==========================================
export const getUserBalance = async () => {
  // GETS from https://xcombinator.onrender.com/api/users/balance
  const response = awaitapi.get("/users/balance");
  return response.data;
};

export const getTransactionHistory = async () => {
  // GETS from https://xcombinator.onrender.com/api/finance/transactions
  const response = awaitapi.get("/finance/transactions");
  return response.data;
};

export const submitPaymentReceipt = async (paymentData) => {
  // POSTS to https://xcombinator.onrender.com/api/finance/submit-payment
  const response = awaitapi.post("/finance/submit-payment", paymentData);
  return response.data;
};

// ==========================================
// ⚡ IDENTITY VERIFICATION ENDPOINTS (NIN)
// ==========================================
export const triggerInstantVerify = async (payload) => {
  // POSTS to https://xcombinator.onrender.com/api/services/verify
  const response = awaitapi.post("/services/verify", payload);
  return response.data;
};

export const submitManualNInRequest = async (payload) => {
  // POSTS to https://xcombinator.onrender.com/api/services/request
  const response = awaitapi.post("/services/request", payload);
  return response.data;
};

// ==========================================
// 🏢 CORPORATE AFFAIRS COMMISSION (CAC) ENDPOINTS
// ==========================================
export const submitCacFiling = async (cacData) => {
  // POSTS to https://xcombinator.onrender.com/api/cac/submit
  const response = awaitapi.post("/cac/submit", cacData);
  return response.data;
};

export const getCacFilingHistory = async () => {
  // GETS from https://xcombinator.onrender.com/api/cac/history
  const response = awaitapi.get("/cac/history");
  return response.data;
};

// ==========================================
// 🛠️ ADMIN CONTROL PIPELINES
// ==========================================
export const adminGetPendingPayments = async () => {
  const response = awaitapi.get("/finance/admin/payments");
  return response.data;
};

export const adminApprovePayment = async (transactionId) => {
  const response = awaitapi.post(`/finance/admin/payments/${transactionId}/approve`);
  return response.data;
};

export const adminRejectPayment = async (transactionId) => {
  const response = awaitapi.post(`/finance/admin/payments/${transactionId}/reject`);
  return response.data;
};

export const adminGetIdentityRequests = async () => {
  const response = awaitapi.get("/services/admin/requests");
  return response.data;
};

export const adminGetCacRequests = async () => {
  const response = awaitapi.get("/cac/admin/requests");
  return response.data;
};