/** @vitest-environment jsdom */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ user: { id: "user-1", firstName: "Test" }, walletBalance: 1200 }),
}));

vi.mock("../../../lib/axios", () => ({ default: apiMocks }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("../../../components/ui/PageHeader", () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock("../../../components/ui/Button", () => ({ default: ({ children, ...props }) => <button {...props}>{children}</button> }));
vi.mock("../../../components/ui/ActionButton", () => ({ default: ({ title, onClick }) => <button onClick={onClick}>{title}</button> }));
vi.mock("../../../components/ui/StatCard", () => ({ default: ({ title }) => <div>{title}</div> }));
vi.mock("../../../components/ui/Card", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../../components/ui/Grid", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../../components/ui/Section", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../../components/ui/Badge", () => ({ default: ({ children }) => <span>{children}</span> }));
vi.mock("../ActivityCard", () => ({ default: () => null }));

import Dashboard from "../Dashboard";

describe("Dashboard service quick actions", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("shows only enabled verification and active service categories", async () => {
    apiMocks.get.mockImplementation((path) => {
      if (path === "/api/services/categories") {
        return Promise.resolve({ data: { categories: [
          { slug: "nimc", label: "NIMC", isActive: true },
          { slug: "cac", label: "CAC", isActive: true },
          { slug: "jamb", label: "JAMB", isActive: false },
        ] } });
      }
      if (path === "/api/pricing") {
        return Promise.resolve({ data: { platformServices: { verifyNin: { enabled: false } } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole("button", { name: "NIMC Services" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "CAC Services" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Wallet" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Verify NIN" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Verify BVN" })).toBeNull();
    expect(screen.queryByRole("button", { name: "JAMB Services" })).toBeNull();
    expect(screen.queryByRole("button", { name: "CSE Services" })).toBeNull();
  });
});
