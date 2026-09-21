import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/axios";

const ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "admin@xcombinator.com";
const SESSION_LAST_ACTIVITY_KEY = "lastActivity";
const MAX_IDLE_MS = 60 * 60 * 1000; // 60 minutes
const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [units, setUnits] = useState(0);
  const [walletBalance, setWalletBalance] = useState(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

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
      commissionBalance: Number(userData.commissionBalance ?? 0),
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
      setIsBalanceLoading(true);
      const res = await api.get("/api/users/wallet");

      if (res.data) {
        if (res.data.units !== undefined) updateUnits(res.data.units);

        const serverWalletBalance =
          res.data.walletBalance !== undefined
            ? Number(res.data.walletBalance)
            : res.data.walletBalanceKobo !== undefined
              ? Number((Number(res.data.walletBalanceKobo || 0) / 100).toFixed(2))
              : undefined;

        if (serverWalletBalance !== undefined) {
          updateWalletBalance(serverWalletBalance);
        }

        if (res.data.commissionBalance !== undefined) {
          setUser((prev) => prev ? { ...prev, commissionBalance: Number(res.data.commissionBalance || 0) } : prev);
        }
      }
      return res.data;
    } catch (error) {
      console.error("❌ BALANCE SYNC ERROR:", error.response?.status, error.message);

      if (retryCount < MAX_RETRIES && (!error.response || error.response.status >= 500)) {
        console.log(`Retrying balance sync... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => apiUnits(retryCount + 1), 2000);
      }
      throw error;
    }
    finally {
      setIsBalanceLoading(false);
    }
  };

  // =========================
  // LOAD USER FROM STORAGE
  // =========================
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const lastActivity = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY) || 0);
    const isExpired = lastActivity && Date.now() - lastActivity > MAX_IDLE_MS;

    if (storedUser && isExpired) {
      clearUser();
      localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
      return;
    }

    if (storedUser) {
      const normalized = normalizeUser(storedUser);
      setUser(normalized);
      setUnits(normalized.units);
      if (normalized.walletBalance !== undefined && normalized.walletBalance !== null) {
        setWalletBalance(normalized.walletBalance);
      }
      localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    apiUnits().catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const markActivity = () => {
      localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
    };

    activityEvents.forEach((event) => window.addEventListener(event, markActivity));

    const idleChecker = setInterval(() => {
      const lastActivity = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY) || 0);
      if (lastActivity && Date.now() - lastActivity > MAX_IDLE_MS) {
        clearUser();
        window.location.href = "/login";
      }
    }, 60_000);

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
      clearInterval(idleChecker);
    };
  }, [user]);

  useEffect(() => {
    let keepAliveInterval = null;

    const pingServer = async () => {
      try {
        await api.get("/api/ping");
        console.debug("Keep-alive ping succeeded");
      } catch (err) {
        console.warn("Keep-alive ping failed", err?.message || err);
      }
    };

    pingServer();
    keepAliveInterval = setInterval(pingServer, 10 * 60 * 1000); // every 10 minutes

    return () => {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
  }, []);

  // =========================
  // UPDATE USER
  // =========================
  const updateUser = (userData) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    setUnits(normalized.units);
    setWalletBalance((prev) => normalized.walletBalance ?? prev ?? null);
    localStorage.setItem("user", JSON.stringify(normalized));
    localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
    if (normalized?.id) {
      apiUnits().catch(() => {});
    }
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
    const nextBalance = typeof newBalance === "function" ? newBalance(walletBalance) : Number(newBalance ?? walletBalance ?? 0);
    setWalletBalance(Number.isFinite(nextBalance) ? Number(nextBalance.toFixed(2)) : 0);
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, walletBalance: Number.isFinite(nextBalance) ? Number(nextBalance.toFixed(2)) : 0 };
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
    setWalletBalance(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        units,
        walletBalance,
        balance: walletBalance,
        isBalanceLoading,
        setUnits: updateUnits,
        setUser: updateUser,
        setBalance: updateWalletBalance,
        updateWalletBalance,
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