import { createContext, useContext, useState, useEffect } from "react";
 
const API_BASE = "https://xcombinator.onrender.com";
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

    normalized.isAdmin =
      normalized.email?.toLowerCase().trim() === ADMIN_EMAIL;

    return normalized;
  };

  // =========================
  // FETCH UNITS FROM BACKEND 🔥
  // =========================
  const fetchUnits = async (userId) => {
    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE}/api/balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (res.ok && data.units !== undefined) {
        updateUnits(data.units);
      }

    } catch (error) {
      console.error("❌ UNIT SYNC ERROR:", error);
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

      // 🔥 INITIAL SYNC
      fetchUnits(normalized.id);
    }
  }, []);

  // =========================
  // AUTO SYNC EVERY 5s 🔥
  // =========================
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      fetchUnits(user.id);
    }, 30000);

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

      const updated = {
        ...prev,
        units: newUnits,
      };

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
  };

  return (
    <UserContext.Provider
      value={{
        user,
        units,
        setUnits: updateUnits,
        setUser: updateUser,
        clearUser,

        // 🔥 ADMIN FLAG
        isAdmin: user?.isAdmin || false,

        // 🔥 MANUAL REFRESH
        refreshUnits: () => fetchUnits(user?.id),
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}