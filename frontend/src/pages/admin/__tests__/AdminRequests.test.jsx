/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../../../context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock("../../../components/ui/SlideOver", () => ({
  default: () => null,
}));

vi.mock("../RequestDetails", () => ({
  default: () => null,
}));

import api from "../../../lib/axios";
import AdminRequests from "../AdminRequests";

const requestResponse = {
  success: true,
  data: [{
    _id: "request-1",
    createdAt: "2025-05-01T00:00:00.000Z",
    status: "pending",
    serviceName: "Name Modification",
    agentName: "Bridget Omoigui",
  }],
  pagination: { total: 8, page: 1, pages: 1, limit: 12 },
  analytics: {
    totalRequests: 8,
    totalAmount: 145000,
    pending: 3,
    inProgress: 1,
    completed: 3,
    rejected: 1,
    services: [
      { service: "Name Modification", count: 5, totalAmount: 90000, completed: 3, completionRate: 60 },
      { service: "DOB Modification", count: 3, totalAmount: 55000, completed: 0, completionRate: 0 },
    ],
  },
};

describe("AdminRequests", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => {
      if (path === "/api/services/categories") {
        return Promise.resolve({ data: { categories: [{ slug: "nimc", label: "NIMC" }, { slug: "cac", label: "CAC" }] } });
      }
      if (path === "/api/admin/requests") return Promise.resolve({ data: requestResponse });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  test("shows the metrics first and keeps service insights collapsible", async () => {
    render(<MemoryRouter><AdminRequests /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Service Requests" })).toBeTruthy();
    expect(screen.getByLabelText("Request metrics")).toBeTruthy();
    expect(screen.getByText("₦145,000")).toBeTruthy();
    expect(screen.getByText("38%")).toBeTruthy();
    expect(screen.queryByText("Highest request volume")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Service breakdown insights/ }));
    expect(screen.getByText("Highest request volume")).toBeTruthy();
    expect(screen.getByText("Lower request volume")).toBeTruthy();
    expect(screen.getAllByText("Name Modification").length).toBeGreaterThan(0);
    expect(screen.getByText("DOB Modification")).toBeTruthy();
    expect(screen.getByLabelText("Search service requests")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Advanced filters/ }));
    expect(screen.getByLabelText("From date")).toBeTruthy();
    expect(screen.getByLabelText("Maximum amount")).toBeTruthy();
  });

  test("applies date and amount filters without requiring a wide fixed toolbar", async () => {
    render(<MemoryRouter><AdminRequests /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Service Requests" });

    fireEvent.click(screen.getByRole("button", { name: /Advanced filters/ }));
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2025-04-01" } });
    fireEvent.change(screen.getByLabelText("Maximum amount"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => {
      const requestCall = api.get.mock.calls.filter(([path]) => path === "/api/admin/requests").at(-1);
      expect(requestCall[1].params).toMatchObject({
        fromDate: "2025-04-01",
        maxAmount: "50000",
      });
    });
  });
});
