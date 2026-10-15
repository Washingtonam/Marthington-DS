/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../lib/axios", () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import api from "../../../lib/axios";
import FinancialReports from "../FinancialReports";

const reportResponse = {
  data: {
    period: { from: "2026-10-01", to: "2026-10-15" },
    summary: {
      walletFundingReceived: 5000,
      pendingWalletFunding: 1000,
      completedServiceSales: 2000,
      knownServiceCosts: 500,
      grossProfitBeforeCommissions: 1500,
      commissionsEarned: 200,
      profitAfterCommissions: 1300,
      commissionBalancesDue: 900,
      customerWalletBalances: 7000,
      completedRequests: 2,
      requestsMissingCost: 1,
      fundingTransactionsReceived: 1,
      fundingTransactionsPending: 1,
    },
    serviceBreakdown: [{
      service: "Name Modification",
      category: "NIMC",
      completedCount: 2,
      revenue: 2000,
      knownCost: 500,
      profit: 1500,
      missingCostCount: 1,
    }],
    commissionRecipients: [],
    activity: [],
  },
};

describe("FinancialReports", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => path === "/api/admin/services"
      ? Promise.resolve({ data: { services: [
        { serviceCode: "validation-noRecord", name: "No Record", category: "NIMC", price: 1000, cost: null },
        { serviceCode: "modification-name", name: "Name Modification", category: "NIMC", price: 12000, cost: 2500 },
      ] } })
      : Promise.resolve(reportResponse));
    api.put.mockResolvedValue({
      data: { service: { serviceCode: "validation-noRecord", cost: 750 } },
    });
  });

  test("loads the report and distinguishes wallet funding from service profit", async () => {
    render(<FinancialReports />);

    expect(await screen.findByRole("heading", { name: "Financial reports" })).toBeTruthy();
    expect(await screen.findByText("₦1,300.00")).toBeTruthy();
    expect(screen.getByText(/customer wallet funds, not service profit/i)).toBeTruthy();
    expect(screen.getByText("1 completed request(s)")).toBeTruthy();
    expect(screen.getByText(/no configured service cost/i)).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/api/finance/reports", {
      params: expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    });
  });

  test("applies a selected report date range without exporting unfiltered rows", async () => {
    render(<FinancialReports />);
    await screen.findByText("₦1,300.00");

    fireEvent.change(screen.getByLabelText("Report start date"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Report end date"), { target: { value: "2026-09-30" } });
    expect(api.get).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
    expect(api.get).toHaveBeenLastCalledWith("/api/finance/reports", {
      params: { from: "2026-09-01", to: "2026-09-30" },
    });
  });

  test("updates only the selected service cost and refreshes report calculations", async () => {
    render(<FinancialReports />);
    const serviceSelect = await screen.findByLabelText("Service to update cost");
    fireEvent.change(serviceSelect, { target: { value: "validation-noRecord" } });
    fireEvent.change(screen.getByLabelText("Cost for profit calculation"), { target: { value: "750" } });
    fireEvent.click(screen.getByRole("button", { name: "Save cost" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      "/api/admin/services/validation-noRecord",
      { cost: 750 },
    ));
    expect(await screen.findByText(/customer price is unchanged/i)).toBeTruthy();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
  });
});
