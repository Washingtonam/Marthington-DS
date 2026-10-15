const Transaction = require("../models/transaction.model");
const ServiceRequest = require("../models/ServiceRequest.model");
const CacRequest = require("../models/CacRequest.model");
const VerificationRequest = require("../models/VerificationRequest.model");
const User = require("../models/User.model");
const PayoutDetails = require("../models/PayoutDetails.model");
const Pricing = require("../models/Pricing.model");

const SUCCESS_STATUSES = ["approved", "success", "successful"];
const COMPLETED_STATUSES = ["completed"];
const OPEN_STATUSES = ["pending", "in-progress", "processing"];

const toKobo = (koboValue, nairaValue) => {
  const amountKobo = Number(koboValue);
  const amountNaira = Number(nairaValue);
  if (
    koboValue !== undefined
    && koboValue !== null
    && Number.isFinite(amountKobo)
    && (amountKobo !== 0 || !Number.isFinite(amountNaira) || amountNaira === 0)
  ) {
    return Math.round(amountKobo);
  }
  return Number.isFinite(amountNaira) ? Math.round(amountNaira * 100) : 0;
};

const fromKobo = (value) => Number((Number(value || 0) / 100).toFixed(2));

const getRequestAmountKobo = (request) => toKobo(
  request.amountKobo,
  request.priceAtTimeOfRequest ?? request.amountCharged ?? request.amount
);

const getCostKobo = (request) => {
  const sourceCost = request.costAtTimeOfRequest ?? request.currentCatalogCost;
  if (sourceCost === undefined || sourceCost === null) return null;
  const cost = Number(sourceCost);
  return Number.isFinite(cost) && cost >= 0 ? Math.round(cost * 100) : null;
};

const findCatalogService = (request, catalog) => {
  const isCac = Boolean(request.serviceType);
  const isVerification = Boolean(request.method);
  const identifiers = isCac
    ? [request.serviceType]
    : isVerification
      ? [request.method]
      : [request.serviceCode, `${request.service}-${request.type}`, request.type, request.service];
  return identifiers
    .filter(Boolean)
    .map((identifier) => catalog.find((service) => (
      String(service.serviceCode || "").toLowerCase() === String(identifier).toLowerCase()
      || String(service.type || "").toLowerCase() === String(identifier).toLowerCase()
    )))
    .find(Boolean);
};

const applyCatalogCost = (request, catalog) => {
  if (request.costAtTimeOfRequest !== undefined && request.costAtTimeOfRequest !== null) return request;
  const configuredCost = findCatalogService(request, catalog)?.cost;
  return configuredCost == null ? request : { ...request, currentCatalogCost: configuredCost };
};

const getUserName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
  || user?.email
  || "Unknown user";

const isIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getRange = (from, to) => {
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) return null;
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { $gte: start, $lt: end };
};

const buildSummary = ({ funding, serviceRequests, cacRequests, verificationRequests = [], commissions, users }) => {
  const allRequests = [
    ...serviceRequests.map((request) => ({ ...request, reportKind: "service" })),
    ...cacRequests.map((request) => ({ ...request, reportKind: "cac" })),
    ...verificationRequests.map((request) => ({ ...request, reportKind: "verification" })),
  ];
  const deliveredRequests = allRequests.filter((request) => COMPLETED_STATUSES.includes(String(request.status || "").toLowerCase()));
  const openRequests = allRequests.filter((request) => OPEN_STATUSES.includes(String(request.status || "").toLowerCase()));
  const receivedFundingKobo = funding
    .filter((transaction) => SUCCESS_STATUSES.includes(String(transaction.status || "").toLowerCase()))
    .reduce((sum, transaction) => sum + toKobo(transaction.amountKobo, transaction.amount), 0);
  const pendingFundingKobo = funding
    .filter((transaction) => String(transaction.status || "").toLowerCase() === "pending")
    .reduce((sum, transaction) => sum + toKobo(transaction.amountKobo, transaction.amount), 0);
  const serviceSalesKobo = deliveredRequests.reduce((sum, request) => sum + getRequestAmountKobo(request), 0);
  const knownCostsKobo = deliveredRequests.reduce((sum, request) => sum + (getCostKobo(request) ?? 0), 0);
  const unknownCostCount = deliveredRequests.filter((request) => getCostKobo(request) === null).length;
  const commissionsEarnedKobo = commissions.reduce(
    (sum, transaction) => sum + toKobo(transaction.amountKobo, transaction.amount),
    0
  );
  const commissionOutstandingKobo = users.reduce(
    (sum, user) => sum + toKobo(user.commissionBalanceKobo, user.commissionBalance),
    0
  );
  const customerWalletBalancesKobo = users.reduce(
    (sum, user) => sum + toKobo(user.walletBalanceKobo, user.walletBalance),
    0
  );
  const openRequestValueKobo = openRequests.reduce((sum, request) => sum + getRequestAmountKobo(request), 0);

  return {
    walletFundingReceived: fromKobo(receivedFundingKobo),
    pendingWalletFunding: fromKobo(pendingFundingKobo),
    completedServiceSales: fromKobo(serviceSalesKobo),
    knownServiceCosts: fromKobo(knownCostsKobo),
    grossProfitBeforeCommissions: fromKobo(serviceSalesKobo - knownCostsKobo),
    commissionsEarned: fromKobo(commissionsEarnedKobo),
    profitAfterCommissions: fromKobo(serviceSalesKobo - knownCostsKobo - commissionsEarnedKobo),
    commissionBalancesDue: fromKobo(commissionOutstandingKobo),
    customerWalletBalances: fromKobo(customerWalletBalancesKobo),
    completedRequests: deliveredRequests.length,
    openRequests: openRequests.length,
    openRequestValue: fromKobo(openRequestValueKobo),
    requestsMissingCost: unknownCostCount,
    requestsUsingCurrentCatalogCost: deliveredRequests.filter((request) => (
      (request.costAtTimeOfRequest === undefined || request.costAtTimeOfRequest === null)
      && request.currentCatalogCost !== undefined
      && request.currentCatalogCost !== null
    )).length,
    fundingTransactionsReceived: funding.filter((transaction) => SUCCESS_STATUSES.includes(String(transaction.status || "").toLowerCase())).length,
    fundingTransactionsPending: funding.filter((transaction) => String(transaction.status || "").toLowerCase() === "pending").length,
  };
};

const getFinancialReport = async (req, res) => {
  const { from, to } = req.query;
  const dateRange = getRange(from, to);
  if (!dateRange) {
    return res.status(400).json({ success: false, message: "Use valid from and to dates in YYYY-MM-DD format." });
  }

  try {
    const [funding, serviceRequests, cacRequests, verificationRequests, commissions, users, catalog] = await Promise.all([
      Transaction.find({
        createdAt: dateRange,
        type: { $in: ["UNIT_ADD", "credit"] },
      })
        .select("userId type amount amountKobo status reference description createdAt")
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean(),
      ServiceRequest.find({ createdAt: dateRange })
        .select("userId service type serviceCategory amount amountKobo priceAtTimeOfRequest costAtTimeOfRequest status paymentSource createdAt")
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean(),
      CacRequest.find({ createdAt: dateRange })
        .select("userId serviceType serviceCategory amountCharged costAtTimeOfRequest status paymentSource createdAt")
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean(),
      VerificationRequest.find({ createdAt: dateRange })
        .select("userId method amount amountKobo status createdAt")
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean(),
      Transaction.find({ createdAt: dateRange, type: "COMMISSION", status: { $in: SUCCESS_STATUSES } })
        .select("userId amount amountKobo status createdAt")
        .populate("userId", "firstName lastName email")
        .lean(),
      User.find({
        $or: [
          { commissionBalanceKobo: { $gt: 0 } },
          { commissionBalance: { $gt: 0 } },
          { walletBalanceKobo: { $gt: 0 } },
          { walletBalance: { $gt: 0 } },
        ],
      })
        .select("firstName lastName email commissionBalance commissionBalanceKobo walletBalance walletBalanceKobo")
        .lean(),
      Pricing.getServiceCatalog(),
    ]);

    const catalogCostServiceRequests = serviceRequests.map((request) => applyCatalogCost(request, catalog));
    const catalogCostCacRequests = cacRequests.map((request) => applyCatalogCost(request, catalog));
    const catalogCostVerificationRequests = verificationRequests.map((request) => applyCatalogCost(request, catalog));
    const summary = buildSummary({
      funding,
      serviceRequests: catalogCostServiceRequests,
      cacRequests: catalogCostCacRequests,
      verificationRequests: catalogCostVerificationRequests,
      commissions,
      users,
    });
    const serviceByCode = new Map(catalog.map((service) => [String(service.serviceCode).toLowerCase(), service]));
    const serviceTotals = new Map();
    const requestRows = [...catalogCostServiceRequests, ...catalogCostCacRequests, ...catalogCostVerificationRequests].map((request) => {
      const isCac = Boolean(request.serviceType);
      const isVerification = Boolean(request.method);
      const requestIdentifier = String(isCac
        ? request.serviceType
        : isVerification
          ? request.method
          : request.service || request.type || "service");
      const identifierCandidates = isCac
        ? [request.serviceType]
        : isVerification
          ? [request.method]
        : [request.serviceCode, `${request.service}-${request.type}`, request.type, request.service];
      const catalogService = identifierCandidates
        .filter(Boolean)
        .map((identifier) => serviceByCode.get(String(identifier).toLowerCase())
          || catalog.find((service) => String(service.type || "").toLowerCase() === String(identifier).toLowerCase()))
        .find(Boolean);
      const name = catalogService?.name || (isVerification ? requestIdentifier.toUpperCase() : requestIdentifier);
      const category = request.serviceCategory || catalogService?.category || (isCac ? "CAC" : isVerification ? "Verification" : "NIMC");
      const status = String(request.status || "pending").toLowerCase();
      const revenueKobo = getRequestAmountKobo(request);
      const costKobo = getCostKobo(request);
      const serviceKey = `${String(category).toLowerCase()}:${requestIdentifier.toLowerCase()}`;
      if (!serviceTotals.has(serviceKey)) {
        serviceTotals.set(serviceKey, {
          service: name,
          category,
          completedCount: 0,
          revenueKobo: 0,
          costKobo: 0,
          missingCostCount: 0,
        });
      }
      const serviceTotal = serviceTotals.get(serviceKey);
      if (COMPLETED_STATUSES.includes(status)) {
        serviceTotal.completedCount += 1;
        serviceTotal.revenueKobo += revenueKobo;
        if (costKobo === null) serviceTotal.missingCostCount += 1;
        else serviceTotal.costKobo += costKobo;
      }

      return {
        id: String(request._id),
        date: request.createdAt,
        type: isCac ? "CAC service" : isVerification ? "Verification" : "Service",
        service: name,
        category,
        user: getUserName(request.userId),
        email: request.userId?.email || "",
        status,
        paymentSource: request.paymentSource || "main",
        revenue: fromKobo(revenueKobo),
        cost: costKobo === null ? null : fromKobo(costKobo),
      };
    });

    const serviceBreakdown = [...serviceTotals.values()]
      .map((item) => ({
        service: item.service,
        category: item.category,
        completedCount: item.completedCount,
        revenue: fromKobo(item.revenueKobo),
        knownCost: fromKobo(item.costKobo),
        profit: fromKobo(item.revenueKobo - item.costKobo),
        missingCostCount: item.missingCostCount,
      }))
      .sort((first, second) => second.revenue - first.revenue);

    const userIds = users
      .filter((user) => toKobo(user.commissionBalanceKobo, user.commissionBalance) > 0)
      .map((user) => user._id);
    const payoutDetails = userIds.length
      ? await PayoutDetails.find({ userId: { $in: userIds } })
        .select("userId bankName accountName accountNumber")
        .lean()
      : [];
    const payoutsByUserId = new Map(payoutDetails.map((details) => [String(details.userId), details]));
    const commissionRecipients = users
      .map((user) => {
        const balanceKobo = toKobo(user.commissionBalanceKobo, user.commissionBalance);
        if (balanceKobo <= 0) return null;
        const details = payoutsByUserId.get(String(user._id));
        return {
          userId: String(user._id),
          name: getUserName(user),
          email: user.email,
          balance: fromKobo(balanceKobo),
          bankName: details?.bankName || "",
          accountName: details?.accountName || "",
          accountNumberMasked: details?.accountNumber ? `••••••${details.accountNumber.slice(-4)}` : "",
        };
      })
      .filter(Boolean)
      .sort((first, second) => second.balance - first.balance);

    const fundingRows = funding.map((transaction) => ({
      id: String(transaction._id),
      date: transaction.createdAt,
      type: "Wallet funding",
      service: transaction.description || transaction.reference || "Wallet funding",
      category: "Funding",
      user: getUserName(transaction.userId),
      email: transaction.userId?.email || "",
      status: String(transaction.status || "pending").toLowerCase(),
      paymentSource: transaction.type,
      revenue: fromKobo(toKobo(transaction.amountKobo, transaction.amount)),
      cost: null,
    }));

    const commissionRows = commissions.map((transaction) => ({
      id: String(transaction._id),
      date: transaction.createdAt,
      type: "Commission earned",
      service: "Commission credited",
      category: "Commission",
      user: getUserName(transaction.userId),
      email: transaction.userId?.email || "",
      status: String(transaction.status || "success").toLowerCase(),
      paymentSource: "commission",
      revenue: fromKobo(toKobo(transaction.amountKobo, transaction.amount)),
      cost: null,
    }));

    const reportActivity = [...fundingRows, ...requestRows, ...commissionRows]
      .sort((first, second) => new Date(second.date) - new Date(first.date));

    return res.json({
      success: true,
      period: { from, to },
      summary,
      serviceBreakdown,
      commissionRecipients,
      activity: reportActivity,
    });
  } catch (error) {
    console.error("FINANCIAL REPORT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load the financial report." });
  }
};

module.exports = { getFinancialReport, buildSummary, toKobo, fromKobo, applyCatalogCost };
