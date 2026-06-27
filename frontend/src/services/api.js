import api from "../lib/axios";

// ==========================================
// 👤 AUTHENTICATION
// ==========================================
export const login = async (credentials) => (await api.post("/api/auth/login", credentials)).data;
export const register = async (userData) => (await api.post("/api/auth/register", userData)).data;

// ==========================================
// 💰 USER & FINANCE
// ==========================================
export const getUserBalance = async () => (await api.get("/api/users/balance")).data;
export const getTransactionHistory = async () => (await api.get("/api/finance/transactions")).data;
export const submitPaymentReceipt = async (paymentData) => (await api.post("/api/finance/submit-payment", paymentData)).data;

// ==========================================
// ⚡ IDENTITY VERIFICATION (NIN)
// ==========================================
export const triggerInstantVerify = async (payload) => (await api.post("/api/services/verify", payload)).data;
export const submitManualNInRequest = async (payload) => (await api.post("/api/services/request", payload)).data;
export const submitSelfServiceRequest = async (payload) => (await api.post("/api/services/request", payload)).data;

// ==========================================
// 🏢 CORPORATE AFFAIRS (CAC)
// ==========================================
export const submitCacFiling = async (cacData) => (await api.post("/api/cac/submit", cacData)).data;
export const getCacFilingHistory = async () => (await api.get("/api/cac/history")).data;

// ==========================================
// 🛠️ ADMIN CONTROL PIPELINES
// ==========================================
export const adminGetPendingPayments = async () => (await api.get("/api/finance/payments")).data;
export const adminGetPaymentsLedger = async (params) => (await api.get("/api/admin/payments/ledger", { params })).data;
export const adminApprovePayment = async (transactionId) => (await api.post(`/api/finance/payments/${transactionId}/approve`)).data;
export const adminRejectPayment = async (transactionId) => (await api.post(`/api/finance/payments/${transactionId}/reject`)).data;
export const adminGetIdentityRequests = async () => (await api.get("/api/services/requests")).data;
export const adminGetCacRequests = async () => (await api.get("/api/cac/requests")).data;