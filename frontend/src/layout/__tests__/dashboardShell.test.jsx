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

vi.mock("../../context/BrandingContext", () => ({
  useBranding: () => ({
    businessName: "Marthington",
    businessTagline: "Digital Services",
    businessLogoUrl: "",
    applyBranding: vi.fn(),
    refreshBranding: vi.fn(),
  }),
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
  mocks.get.mockReset();
  mocks.get.mockImplementation(() => new Promise(() => {}));
});

describe("dashboard shell navigation", () => {
  test("collapses desktop navigation to an icon rail and restores the full sidebar", () => {
    window.innerWidth = 1280;
    renderLayout();
    fireEvent(window, new Event("resize"));

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeTruthy();
    expect(document.querySelector("#app-sidebar").getAttribute("aria-hidden")).toBe("false");
    expect(document.querySelector("#app-sidebar").className).toContain("w-20");
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    expect(document.querySelector("#app-sidebar").getAttribute("aria-hidden")).toBe("false");
    expect(document.querySelector("#app-sidebar").className).toContain("w-72");
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

  test("keeps more than two navigation groups expanded independently", () => {
    window.innerWidth = 1280;
    renderLayout();

    ["Activity", "Account", "Services"].forEach((group) => {
      fireEvent.click(screen.getByRole("button", { name: `Expand ${group} navigation group` }));
    });

    ["activity", "account", "services"].forEach((group) => {
      expect(document.querySelector(`#sidebar-group-${group}`).hidden).toBe(false);
    });
  });

  test("shows active catalog categories and respects Verify NIN visibility", async () => {
    mocks.user = { id: "user-1", role: "user" };
    mocks.get.mockImplementation((path) => {
      if (path === "/api/services/categories") {
        return Promise.resolve({ data: { categories: [
          { slug: "nimc", label: "NIMC", isActive: true },
          { slug: "cac", label: "CAC", isActive: true },
          { slug: "jamb", label: "JAMB", isActive: true },
        ] } });
      }
      if (path === "/api/pricing") {
        return Promise.resolve({ data: { platformServices: { verifyNin: { enabled: false } } } });
      }
      return Promise.resolve({ data: {} });
    });
    renderLayout();

    fireEvent.click(screen.getByRole("button", { name: "Expand Services navigation group" }));

    expect(await screen.findByRole("link", { name: "NIMC services" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "CAC services" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "JAMB services" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Verify BVN" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Verify NIN" })).toBeNull();
  });

  test("shows agent and communication navigation only in the super-admin workspace", () => {
    window.innerWidth = 1280;
    mocks.user = { id: "admin-1", role: "super_admin" };
    renderLayout("/admin/agents");

    expect(screen.getByRole("link", { name: "Agents" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log jobs" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Notification center" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Communications" }));
    expect(screen.getByLabelText("Current route").textContent).toBe("/admin/communications");

    cleanup();
    mocks.user = { id: "user-1", role: "user" };
    renderLayout();
    expect(screen.queryByRole("link", { name: "Agents" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Log jobs" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Communications" })).toBeNull();
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

    fireEvent.click(screen.getByRole("button", { name: "Switch to Super Admin workspace" }));

    expect(screen.getByLabelText("Current route").textContent).toBe("/admin");
  });

  test("does not expose the admin workspace to ordinary users", () => {
    mocks.user = { id: "user-1", role: "user" };
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WorkspaceSwitcher isAdminWorkspace={false} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("group", { name: "Workspace" })).toBeNull();
  });
});
