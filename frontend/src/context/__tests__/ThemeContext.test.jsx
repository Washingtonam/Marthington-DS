/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import AppearanceSettings from "../../components/AppearanceSettings";
import { ThemeProvider, useTheme } from "../ThemeContext";

const mocks = vi.hoisted(() => ({
  user: { id: "account-appearance-test" },
}));

vi.mock("../UserContext", () => ({
  useUser: () => ({ user: mocks.user }),
}));

function AppearanceState() {
  const { theme, accent } = useTheme();
  return <output aria-label="Current appearance">{`${theme}|${accent}`}</output>;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.style.cssText = "";
});

describe("account appearance preferences", () => {
  test("loads the saved theme and accent and persists updates for the account", async () => {
    localStorage.setItem("appearance:account-appearance-test", JSON.stringify({
      theme: "dark",
      accent: "#7c3aed",
    }));

    mocks.user = { id: "account-appearance-test" };
    const { rerender } = render(
      <ThemeProvider>
        <AppearanceState />
        <AppearanceSettings />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Current appearance").textContent).toBe("dark|#7c3aed");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Ocean accent" }));
    fireEvent.change(screen.getByLabelText("Choose a custom accent color"), {
      target: { value: "#15803d" },
    });

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("appearance:account-appearance-test"))).toEqual({
        theme: "dark",
        accent: "#15803d",
      });
    });
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#15803d");

    localStorage.setItem("appearance:other-account", JSON.stringify({
      theme: "light",
      accent: "#be123c",
    }));
    mocks.user = { id: "other-account" };
    rerender(
      <ThemeProvider>
        <AppearanceState />
        <AppearanceSettings />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Current appearance").textContent).toBe("light|#be123c");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("appearance:account-appearance-test"))).toEqual({
        theme: "dark",
        accent: "#15803d",
      });
    });
    expect(JSON.parse(localStorage.getItem("appearance:other-account"))).toEqual({
      theme: "light",
      accent: "#be123c",
    });
  });

  test("synchronizes saved appearance updates from another tab", async () => {
    mocks.user = { id: "account-appearance-test" };
    localStorage.setItem("appearance:account-appearance-test", JSON.stringify({
      theme: "light",
      accent: "#2563eb",
    }));

    render(
      <ThemeProvider>
        <AppearanceState />
      </ThemeProvider>,
    );

    const updatedAppearance = { theme: "dark", accent: "#be123c" };
    localStorage.setItem("appearance:account-appearance-test", JSON.stringify(updatedAppearance));
    fireEvent(
      window,
      new StorageEvent("storage", {
        key: "appearance:account-appearance-test",
        newValue: JSON.stringify(updatedAppearance),
      }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Current appearance").textContent).toBe("dark|#be123c");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#be123c");
  });
});
