const { applyCatalogCost, buildSummary } = require("../controllers/financialReports.controller");

describe("financial report summary", () => {
  it("keeps wallet deposits separate, includes verification sales, and excludes unknown costs from known profit", () => {
    const summary = buildSummary({
      funding: [
        { amountKobo: 500000, status: "approved" },
        { amount: 1000, status: "pending" },
        { amount: 250, status: "rejected" },
      ],
      serviceRequests: [
        { amountKobo: 100000, costAtTimeOfRequest: 300, status: "completed" },
        applyCatalogCost({ service: "validation", type: "noRecord", amountKobo: 50000, costAtTimeOfRequest: null, status: "completed" }, [
          { serviceCode: "validation-noRecord", cost: 100 },
        ]),
        { amountKobo: 50000, costAtTimeOfRequest: null, status: "completed" },
        { amountKobo: 25000, costAtTimeOfRequest: 100, status: "pending" },
      ],
      cacRequests: [
        { amountCharged: 2000, costAtTimeOfRequest: null, status: "completed" },
      ],
      verificationRequests: [
        { amount: 500, amountKobo: 0, status: "completed" },
      ],
      commissions: [{ amountKobo: 20000 }],
      users: [
        { commissionBalanceKobo: 90000, walletBalanceKobo: 700000 },
      ],
    });

    expect(summary).toEqual({
      walletFundingReceived: 5000,
      pendingWalletFunding: 1000,
      completedServiceSales: 4500,
      knownServiceCosts: 400,
      grossProfitBeforeCommissions: 4100,
      commissionsEarned: 200,
      profitAfterCommissions: 3900,
      commissionBalancesDue: 900,
      customerWalletBalances: 7000,
      completedRequests: 5,
      openRequests: 1,
      openRequestValue: 250,
      requestsMissingCost: 3,
      requestsUsingCurrentCatalogCost: 1,
      fundingTransactionsReceived: 1,
      fundingTransactionsPending: 1,
    });
  });
});
