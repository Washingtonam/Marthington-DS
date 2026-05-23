import api from "./axios";

export const logActivity = async (action, status = "success", details = {}) => {
  try {
    // This calls the backend route you create in Step 1
    await api.post("/api/audit-logs", { 
      action, 
      status, 
      details,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    // Fail silently to ensure the main user action isn't interrupted
    console.error("Audit log failed:", error);
  }
};