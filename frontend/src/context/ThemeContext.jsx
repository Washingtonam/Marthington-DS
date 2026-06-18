import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
 
const ThemeContext =
  createContext();

export function ThemeProvider({
  children,
}) {

  // =========================
  // INITIAL THEME
  // =========================
  const [theme, setTheme] =
    useState(() => {
      if (typeof window === "undefined") {
        return "dark";
      }

      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") {
        return saved;
      }

      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      return prefersDark ? "dark" : "light";
    });

  // =========================
  // APPLY THEME
  // =========================
  useEffect(() => {

    const root =
      document.documentElement;

    // REMOVE BOTH FIRST
    root.classList.remove(
      "light",
      "dark"
    );

    // APPLY CURRENT
    root.classList.add(theme);

    // SAVE
    localStorage.setItem(
      "theme",
      theme
    );

  }, [theme]);

  // =========================
  // TOGGLE
  // =========================
  const toggleTheme = () => {

    setTheme((prev) =>
      prev === "dark"
        ? "light"
        : "dark"
    );
  };

  // =========================
  // MANUAL SET
  // =========================
  const setDarkMode = () => {
    setTheme("dark");
  };

  const setLightMode = () => {
    setTheme("light");
  };

  return (

    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setDarkMode,
        setLightMode,
      }}
    >

      {children}

    </ThemeContext.Provider>
  );
}

// =========================
// HOOK
// =========================
export function useTheme() {

  return useContext(
    ThemeContext
  );
}