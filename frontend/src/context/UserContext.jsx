import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/axios";

const ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "admin@xcombinator.com";
const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [units, setUnits] = useState(0);

  // =========================
  // NORMALIZE USER
  // =========================
  const normalizeUser = (userData) => {
    if (!userData) return null;

    const normalized = {
      ...userData,
      id: userData.id || userData._id,
      units: userData.units || 0,
    };

    normalized.isAdmin =
      normalized.email?.toLowerCase().trim() === ADMIN_EMAIL;

    return normalized;
  };

  // =========================
  // API UNITS FROM BACKEND WITH RETRY 🔥
  // =========================
  const apiUnits = async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    try {
      const res = await api.get("/balance");
      
      if (res.data && res.data.units !== undefined) {
        updateUnits(res.data.units);
      }
    } catch (error) {
      console.error("❌ UNIT SYNC ERROR:", error.response?.status, error.message);
      
      // Retry logic for network errors (not 4xx errors)
      if (retryCount < MAX_RETRIES && (!error.response || error.response.status >= 500)) {
        console.log(`Retrying unit sync... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => apiUnits(retryCount + 1), 2000);
      }
      // Don't show error to user for background sync, just log
    }
  };

  // =========================
  // LOAD USER FROM STORAGE
  // =========================
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      const normalized = normalizeUser(storedUser);
      setUser(normalized);
      setUnits(normalized.units);
      apiUnits(); // Fixed: Added space
    }
  }, []);

  // =========================
  // AUTO SYNC EVERY 30s 🔥
  // =========================
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(apiUnits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // =========================
  // UPDATE USER
  // =========================
  const updateUser = (userData) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    setUnits(normalized.units);
    localStorage.setItem("user", JSON.stringify(normalized));
  };

  // =========================
  // UPDATE UNITS
  // =========================
  const updateUnits = (newUnits) => {
    setUnits(newUnits);
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, units: newUnits };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  // =========================
  // LOGOUT
  // =========================
  const clearUser = () => {
    setUser(null);
    setUnits(0);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider
      value={{
        user,
        units,
        setUnits: updateUnits,
        setUser: updateUser,
        clearUser,
        isAdmin: user?.isAdmin || false,
        refreshUnits: apiUnits,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}