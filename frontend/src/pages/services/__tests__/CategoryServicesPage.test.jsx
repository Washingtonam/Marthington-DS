/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));

vi.mock("../../../context/UserContext", () => ({
  useUser: () => mockUseUser(),
}));
vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from "../../../lib/axios";
import CategoryServicesPage from "../CategoryServicesPage";

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe("CategoryServicesPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { role: "super_admin" } });
    api.get.mockResolvedValue({
      data: {
        services: [{
          serviceCode: "cac-registration",
          category: "CAC",
          name: "CAC Registration",
          status: "active",
          price: 25000,
          metadata: { description: "Register a business." },
        }],
      },
    });
  });

  test("lets a superadmin right-click a service and open its management editor", async () => {
    render(
      <MemoryRouter initialEntries={["/services/cac"]}>
        <Routes>
          <Route path="/services/:category" element={<CategoryServicesPage />} />
          <Route path="/admin/services-engine/:category" element={<p>Service management</p>} />
        </Routes>
        <CurrentLocation />
      </MemoryRouter>,
    );

    const serviceName = await screen.findByRole("heading", { name: "CAC Registration" });
    fireEvent.contextMenu(serviceName.closest("article"), { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Manage service" }));

    expect(screen.getByTestId("location").textContent).toBe(
      "/admin/services-engine/cac?serviceCode=cac-registration",
    );
  });

  test("does not replace the normal browser context menu for other users", async () => {
    mockUseUser.mockReturnValue({ user: { role: "user" } });
    render(
      <MemoryRouter initialEntries={["/services/cac"]}>
        <Routes><Route path="/services/:category" element={<CategoryServicesPage />} /></Routes>
      </MemoryRouter>,
    );

    const serviceName = await screen.findByRole("heading", { name: "CAC Registration" });
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    serviceName.closest("article").dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole("menuitem", { name: "Manage service" })).toBeNull();
  });
});
