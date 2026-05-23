import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/axios"; // IMPORTANT: Import your configured axios instance

const ADMIN_EMAIL = "washingtonamedu@gmail.com";
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

    // Keep the isAdmin logic
    normalized.isAdmin =
      normalized.email?.toLowerCase().trim() === ADMIN_EMAIL;

    return normalized;
  };

  // =========================
  // FETCH UNITS FROM BACKEND 🔥
  // =========================
  const fetchUnits = async () => {
    // We don't need to pass userId manually if the token is in the header
    try {
      const res = await api.get("/balance"); // Uses Axios interceptor to send JWT automatically
      
      if (res.data && res.data.units !== undefined) {
        updateUnits(res.data.units);
      }
    } catch (error) {
      console.error("❌ UNIT SYNC ERROR:", error.response?.data || error.message);
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
      fetchUnits(); // Call sync
    }
  }, []);

  // =========================
  // AUTO SYNC EVERY 30s 🔥
  // =========================
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchUnits, 30000);
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
    localStorage.removeItem("token"); // Ensure token is also cleared
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
        refreshUnits: fetchUnits,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}