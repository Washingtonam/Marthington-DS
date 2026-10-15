/* eslint react-refresh/only-export-components: "off" */
import React, { createContext, useContext, useEffect, useState } from "react";
import { ACCENT_PRESETS } from "../config/appearance";
import { useUser } from "./UserContext";

const DEFAULT_APPEARANCE = { theme: "light", accent: ACCENT_PRESETS[0].color };
const ThemeContext = createContext(null);

const getAccountId = (user) => user?.id || user?._id || user?.email?.toLowerCase() || null;
const appearanceKey = (accountId) => `appearance:${accountId}`;

function isHexColor(color) {
  return typeof color === "string" && /^#[\da-f]{6}$/i.test(color);
}

function readStoredAppearance(accountId) {
  if (accountId) {
    try {
      const stored = JSON.parse(localStorage.getItem(appearanceKey(accountId)) || "null");
      if (stored && (stored.theme === "light" || stored.theme === "dark") && isHexColor(stored.accent)) {
        return { theme: stored.theme, accent: stored.accent };
      }
    } catch (error) {
      console.error("Could not read saved appearance preferences:", error);
    }
  }

  const legacyTheme = accountId ? null : localStorage.getItem("theme");
  const prefersDark = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return {
    ...DEFAULT_APPEARANCE,
    theme: legacyTheme === "dark" ? "dark" : legacyTheme === "light" ? "light" : prefersDark ? "dark" : DEFAULT_APPEARANCE.theme,
  };
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function contrastForeground({ r, g, b }) {
  const luminance = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const relativeLuminance = 0.2126 * luminance[0] + 0.7152 * luminance[1] + 0.0722 * luminance[2];
  return relativeLuminance > 0.179 ? "#111827" : "#ffffff";
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function mixColors(first, second, amount) {
  const from = hexToRgb(first);
  const to = hexToRgb(second);
  return `#${["r", "g", "b"].map((channel) => Math.round(from[channel] + (to[channel] - from[channel]) * amount).toString(16).padStart(2, "0")).join("")}`;
}

function readableAccent(hex, theme) {
  const background = theme === "dark" ? "#020617" : "#ffffff";
  if (contrastRatio(hex, background) >= 4.5) return hex;
  const target = contrastRatio("#ffffff", background) > contrastRatio("#000000", background)
    ? "#ffffff"
    : "#000000";
  let low = 0;
  let high = 1;
  for (let index = 0; index < 16; index += 1) {
    const middle = (low + high) / 2;
    if (contrastRatio(mixColors(hex, target, middle), background) >= 4.5) high = middle;
    else low = middle;
  }
  return mixColors(hex, target, high);
}

function darken(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `#${[r, g, b].map((channel) => Math.round(channel * 0.84).toString(16).padStart(2, "0")).join("")}`;
}

function hoverAccent(hex, theme) {
  const foreground = contrastForeground(hexToRgb(hex));
  return foreground === "#ffffff"
    ? darken(hex)
    : mixColors(hex, "#ffffff", theme === "dark" ? 0.2 : 0.12);
}

export function ThemeProvider({ children }) {
  const { user } = useUser();
  const accountId = getAccountId(user);
  return (
    <AccountThemeProvider key={accountId || "anonymous"} accountId={accountId}>
      {children}
    </AccountThemeProvider>
  );
}

function AccountThemeProvider({ accountId, children }) {
  const [appearance, setAppearanceState] = useState(() => readStoredAppearance(accountId));

  useEffect(() => {
    if (!accountId) return undefined;
    const key = appearanceKey(accountId);
    const syncAppearance = (event) => {
      if (event.key !== key) return;
      setAppearanceState(readStoredAppearance(accountId));
    };
    window.addEventListener("storage", syncAppearance);
    return () => window.removeEventListener("storage", syncAppearance);
  }, [accountId]);

  useEffect(() => {
    const root = document.documentElement;
    const rgb = hexToRgb(appearance.accent);
    root.classList.toggle("dark", appearance.theme === "dark");
    root.classList.toggle("light", appearance.theme === "light");
    root.style.setProperty("--accent", appearance.accent);
    root.style.setProperty("--accent-strong", hoverAccent(appearance.accent, appearance.theme));
    root.style.setProperty("--accent-foreground", contrastForeground(rgb));
    root.style.setProperty("--accent-text", readableAccent(appearance.accent, appearance.theme));
    root.style.setProperty("--accent-focus", readableAccent(appearance.accent, appearance.theme));
    root.style.setProperty("--accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    localStorage.setItem("theme", appearance.theme);

    if (accountId) {
      try {
        localStorage.setItem(appearanceKey(accountId), JSON.stringify(appearance));
      } catch (error) {
        console.error("Could not save appearance preferences:", error);
      }
    }
  }, [appearance, accountId]);

  const setAppearance = (updates) => {
    setAppearanceState((current) => {
      const next = typeof updates === "function" ? updates(current) : { ...current, ...updates };
      return {
        theme: next.theme === "dark" ? "dark" : "light",
        accent: isHexColor(next.accent) ? next.accent : current.accent,
      };
    });
  };

  const value = {
    ...appearance,
    appearance,
    setAppearance,
    toggleTheme: () => setAppearance((current) => ({
      ...current,
      theme: current.theme === "dark" ? "light" : "dark",
    })),
    setDarkMode: () => setAppearance({ theme: "dark" }),
    setLightMode: () => setAppearance({ theme: "light" }),
    setAccent: (accent) => setAppearance({ accent }),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
