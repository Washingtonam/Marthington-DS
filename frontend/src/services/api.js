import api from "../lib/axios";

// ==========================================
// 👤 AUTHENTICATION
// ==========================================
export const login = async (credentials) => (await api.post("/auth/login", credentials)).data;
export const register = async (userData) => (await api.post("/auth/register", userData)).data;

// ==========================================
// 💰 USER & FINANCE
// ==========================================
export const getUserBalance = async () => (await api.get("/users/balance")).data;
export const getTransactionHistory = async () => (await api.get("/finance/transactions")).data;
export const submitPaymentReceipt = async (paymentData) => (await api.post("/finance/submit-payment", paymentData)).data;

// ==========================================
// ⚡ IDENTITY VERIFICATION (NIN)
// ==========================================
export const triggerInstantVerify = async (payload) => (await api.post("/services/verify", payload)).data;
export const submitManualNInRequest = async (payload) => (await api.post("/services/request", payload)).data;

// ==========================================
// 🏢 CORPORATE AFFAIRS (CAC)
// ==========================================
export const submitCacFiling = async (cacData) => (await api.post("/cac/submit", cacData)).data;
export const getCacFilingHistory = async () => (await api.get("/cac/history")).data;

// ==========================================
// 🛠️ ADMIN CONTROL PIPELINES
// ==========================================
export const adminGetPendingPayments = async () => (await api.get("/finance/admin/payments")).data;
export const adminApprovePayment = async (transactionId) => (await api.post(`/finance/admin/payments/${transactionId}/approve`)).data;
export const adminRejectPayment = async (transactionId) => (await api.post(`/finance/admin/payments/${transactionId}/reject`)).data;
export const adminGetIdentityRequests = async () => (await api.get("/services/admin/requests")).data;
export const adminGetCacRequests = async () => (await api.get("/cac/admin/requests")).data;