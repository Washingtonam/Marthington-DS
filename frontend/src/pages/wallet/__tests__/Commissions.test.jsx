/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../lib/axios", () => ({
  default: { get: vi.fn() },
}));

import api from "../../../lib/axios";
import Commissions from "../Commissions";

describe("Commissions", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        balance: 2500,
        services: [{
          serviceCode: "name-mod",
          name: "Name Modification",
          category: "NIMC",
          price: 5000,
          commissionType: "PERCENTAGE",
          commissionValue: 10,
        }],
        history: [{
          id: "commission-1",
          amount: 500,
          description: "Commission payout for completed request",
          createdAt: "2025-01-01T00:00:00.000Z",
        }],
      },
    });
  });

  test("shows every registered user's balance, commission estimate, history, and account details link", async () => {
    render(<MemoryRouter><Commissions /></MemoryRouter>);

    expect(await screen.findByText("Available commission balance")).toBeTruthy();
    expect(screen.getByText("Commission calculator")).toBeTruthy();
    expect(screen.getByLabelText("Service")).toBeTruthy();
    expect(screen.getByLabelText("Completed requests")).toBeTruthy();
    expect(screen.getByText("Commission payout for completed request")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Update account details/ }).getAttribute("href")).toBe("/profile");

    fireEvent.change(screen.getByLabelText("Completed requests"), { target: { value: "2" } });
    expect(screen.getByText(/1,000\.00/)).toBeTruthy();
  });
});
