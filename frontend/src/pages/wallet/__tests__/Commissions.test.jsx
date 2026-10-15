/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../lib/axios", () => ({
  default: { get: vi.fn(), put: vi.fn() },
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

  test("shows the user's commission summary and bank payout details form", async () => {
    render(<MemoryRouter><Commissions /></MemoryRouter>);

    expect(await screen.findByText("Available commission balance")).toBeTruthy();
    expect(screen.getByText("Commission calculator")).toBeTruthy();
    expect(screen.getByLabelText("Service")).toBeTruthy();
    expect(screen.getByLabelText("Completed requests")).toBeTruthy();
    expect(screen.getByText("Commission payout for completed request")).toBeTruthy();
    expect(screen.getByLabelText("Bank name")).toBeTruthy();
    expect(screen.getByLabelText("Account holder name")).toBeTruthy();
    expect(screen.getByLabelText("10-digit account number")).toBeTruthy();
    expect(screen.queryByLabelText(/Bank account proof/i)).toBeNull();

    fireEvent.change(screen.getByLabelText("Completed requests"), { target: { value: "2" } });
    expect(screen.getByText(/1,000\.00/)).toBeTruthy();
  });

  test("submits bank details to the payout endpoint without a document", async () => {
    api.put.mockResolvedValue({
      data: {
        message: "Bank details saved for your commission payouts.",
        payoutDetails: {
          bankName: "First Bank",
          accountName: "Ada Agent",
          accountNumberMasked: "••••••1234",
        },
      },
    });
    render(<MemoryRouter><Commissions /></MemoryRouter>);
    await screen.findByText("Commission calculator");
    fireEvent.change(screen.getByLabelText("Bank name"), { target: { value: "First Bank" } });
    fireEvent.change(screen.getByLabelText("Account holder name"), { target: { value: "Ada Agent" } });
    fireEvent.change(screen.getByLabelText("10-digit account number"), { target: { value: "1234561234" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save payout account" }).closest("form"));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      "/api/users/commission/payout-details",
      { bankName: "First Bank", accountName: "Ada Agent", accountNumber: "1234561234" },
    ));
    expect((await screen.findByRole("status")).textContent).toContain("Bank details saved");
  });
});
