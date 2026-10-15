/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import Layout from "../Layout";
import WorkspaceSwitcher from "../../components/WorkspaceSwitcher";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1", firstName: "Morgan", role: "super_admin" },
  error: vi.fn(),
  get: vi.fn(() => new Promise(() => {})),
}));

vi.mock("../../context/UserContext", () => ({
  useUser: () => ({
    user: mocks.user,
    walletBalance: 1250,
    isBalanceLoading: false,
    clearUser: vi.fn(),
  }),
}));

vi.mock("../../context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ error: mocks.error }),
}));

vi.mock("../../lib/axios", () => ({
  default: { get: mocks.get },
}));

vi.mock("../../components/Footer", () => ({ default: () => null }));

function RouteLabel() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

function renderLayout(pathname = "/dashboard") {
  return render(
    <MemoryRouter
      initialEntries={[pathname]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="*" element={<Layout><RouteLabel /></Layout>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  window.innerWidth = 1024;
  mocks.user = { id: "user-1", firstName: "Morgan", role: "super_admin" };
  mocks.get.mockClear();
});

describe("dashboard shell navigation", () => {
  test("collapses desktop navigation while keeping icon links accessible", () => {
    window.innerWidth = 1280;
    renderLayout();

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();
  });

  test("mobile drawer closes after selecting a navigation link", () => {
    window.innerWidth = 390;
    renderLayout();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const dialog = screen.getByRole("dialog", { name: "User navigation" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close sidebar drawer" }));
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Sign out" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand Services navigation group" }));
    fireEvent.click(screen.getByRole("link", { name: "Verify NIN" }));

    expect(screen.getByLabelText("Current route").textContent).toBe("/verify-nin");
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeTruthy();
    expect(document.querySelector("#sidebar-group-services").hidden).toBe(false);
    expect(document.querySelector('#app-sidebar a[href="/verify-nin"]').getAttribute("aria-current")).toBe("page");
  });
});

describe("workspace switching", () => {
  test("allows a super admin to navigate between existing workspaces", () => {
    mocks.user = { id: "admin-1", role: "super_admin" };
    render(
      <MemoryRouter
        initialEntries={["/dashboard"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <WorkspaceSwitcher isAdminWorkspace={false} />
        <RouteLabel />
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Workspace" }), { target: { value: "admin" } });

    expect(screen.getByLabelText("Current route").textContent).toBe("/admin");
  });

  test("does not expose the admin workspace to ordinary users", () => {
    mocks.user = { id: "user-1", role: "user" };
    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WorkspaceSwitcher isAdminWorkspace={false} />
      </MemoryRouter>,
    );

    expect(container.querySelector("select")).toBeNull();
  });
});
