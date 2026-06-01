import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/axios";

const ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "admin@xcombinator.com";
const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [units, setUnits] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  // =========================
  // NORMALIZE USER
  // =========================
  const normalizeUser = (userData) => {
    if (!userData) return null;

    const normalized = {
      ...userData,
      id: userData.id || userData._id,
      units: userData.units || 0,
      walletBalance: Number(userData.walletBalance ?? userData.balance ?? 0),
    };

    normalized.isAdmin =
      normalized.email?.toLowerCase().trim() === ADMIN_EMAIL;

    return normalized;
  };

  // =========================
  // API BALANCE FROM BACKEND WITH RETRY 🔥
  // =========================
  const apiUnits = async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    try {
      const res = await api.get("/api/users/wallet");
      
      if (res.data) {
        if (res.data.units !== undefined) {
          updateUnits(res.data.units);
        }
        if (res.data.walletBalance !== undefined) {
          updateWalletBalance(res.data.walletBalance);
        }
      }
    } catch (error) {
      console.error("❌ BALANCE SYNC ERROR:", error.response?.status, error.message);
      
      if (retryCount < MAX_RETRIES && (!error.response || error.response.status >= 500)) {
        console.log(`Retrying balance sync... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => apiUnits(retryCount + 1), 2000);
      }
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
      setWalletBalance(normalized.walletBalance);
      apiUnits();
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
    setWalletBalance(normalized.walletBalance);
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
  // UPDATE WALLET BALANCE
  // =========================
  const updateWalletBalance = (newBalance) => {
    setWalletBalance(newBalance);
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, walletBalance: newBalance };
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
    setWalletBalance(0);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider
      value={{
        user,
        units,
        walletBalance,
        balance: walletBalance,
        setUnits: updateUnits,
        setUser: updateUser,
        setBalance: updateWalletBalance,
        clearUser,
        isAdmin: user?.isAdmin || false,
        refreshBalance: apiUnits,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}