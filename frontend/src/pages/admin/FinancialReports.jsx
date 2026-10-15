import React, { createElement, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";
import api from "../../lib/axios";

const today = new Date();
const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const formatDate = (value) => value
  ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  : "—";

const exportCsv = (activity, from, to) => {
  const columns = [
    ["Date", "date"],
    ["Type", "type"],
    ["Service / description", "service"],
    ["Category", "category"],
    ["Customer", "user"],
    ["Email", "email"],
    ["Status", "status"],
    ["Payment source", "paymentSource"],
    ["Amount (NGN)", "revenue"],
    ["Known service cost (NGN)", "cost"],
  ];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    columns.map(([label]) => escape(label)).join(","),
    ...activity.map((row) => columns.map(([, key]) => escape(row[key])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `financial-report-${from}-to-${to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const StatCard = ({ label, value, help, icon: Icon, accent = "blue" }) => {
  const accents = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{help}</p>
        </div>
        <span className={`rounded-xl p-3 ${accents[accent]}`}>{createElement(Icon, { size: 20 })}</span>
      </div>
    </article>
  );
};

const TableEmpty = ({ children, columns }) => (
  <tr>
    <td colSpan={columns} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">{children}</td>
  </tr>
);

export default function FinancialReports() {
  const initialFrom = toDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
  const initialTo = toDateInput(today);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [appliedFrom, setAppliedFrom] = useState(initialFrom);
  const [appliedTo, setAppliedTo] = useState(initialTo);
  const [reloadToken, setReloadToken] = useState(0);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catalogServices, setCatalogServices] = useState([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [serviceCostDraft, setServiceCostDraft] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [savingServiceCost, setSavingServiceCost] = useState(false);
  const [costEditorError, setCostEditorError] = useState("");
  const [costEditorSuccess, setCostEditorSuccess] = useState("");

  useEffect(() => {
    let isCurrent = true;
    const fetchReport = async () => {
      try {
        const response = await api.get("/api/finance/reports", {
          params: { from: appliedFrom, to: appliedTo },
        });
        if (isCurrent) {
          setReport(response.data);
          setError("");
        }
      } catch (requestError) {
        console.error("FINANCIAL REPORT LOAD ERROR:", requestError);
        if (isCurrent) {
          setError(requestError.response?.data?.message || "Unable to load this financial report.");
          setReport(null);
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    fetchReport();
    return () => {
      isCurrent = false;
    };
  }, [appliedFrom, appliedTo, reloadToken]);

  useEffect(() => {
    let isCurrent = true;
    const loadServiceCatalog = async () => {
      try {
        const response = await api.get("/api/admin/services");
        const services = Array.isArray(response.data?.services) ? response.data.services : [];
        if (!isCurrent) return;
        setCatalogServices(services);
        setSelectedServiceCode((current) => current || services[0]?.serviceCode || "");
        setServiceCostDraft(services[0]?.cost == null ? "" : String(services[0].cost));
      } catch (catalogError) {
        console.error("FINANCIAL REPORT SERVICE CATALOG ERROR:", catalogError);
        if (isCurrent) {
          setCostEditorError(catalogError.response?.data?.message || "Unable to load services for cost updates.");
        }
      } finally {
        if (isCurrent) setCatalogLoading(false);
      }
    };
    void loadServiceCatalog();
    return () => {
      isCurrent = false;
    };
  }, []);

  const summary = report?.summary || {};
  const activity = useMemo(() => report?.activity || [], [report]);
  const hasUncostedRequests = Number(summary.requestsMissingCost || 0) > 0;
  const selectedService = catalogServices.find((service) => service.serviceCode === selectedServiceCode);

  const saveServiceCost = async (event) => {
    event.preventDefault();
    if (!selectedService) {
      setCostEditorError("Choose a service before updating its cost.");
      return;
    }
    const value = String(serviceCostDraft).trim();
    const cost = value === "" ? null : Number(value);
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      setCostEditorError("Enter a valid non-negative cost, or leave it blank if it is not known.");
      return;
    }

    setSavingServiceCost(true);
    setCostEditorError("");
    setCostEditorSuccess("");
    try {
      const response = await api.put(`/api/admin/services/${encodeURIComponent(selectedService.serviceCode)}`, { cost });
      const savedService = response.data?.service;
      setCatalogServices((current) => current.map((service) => (
        service.serviceCode === selectedService.serviceCode
          ? { ...service, cost: savedService?.cost ?? cost }
          : service
      )));
      setServiceCostDraft(savedService?.cost == null ? "" : String(savedService.cost));
      setCostEditorSuccess(`Cost for ${selectedService.name} saved. This changes reporting cost only; the customer price is unchanged.`);
      setLoading(true);
      setReloadToken((current) => current + 1);
    } catch (saveError) {
      console.error("FINANCIAL REPORT SERVICE COST SAVE ERROR:", saveError);
      setCostEditorError(saveError.response?.data?.message || "Unable to save this service cost.");
    } finally {
      setSavingServiceCost(false);
    }
  };

  const submitPeriod = (event) => {
    event.preventDefault();
    if (!from || !to || from > to) {
      setError("Choose a valid start and end date.");
      return;
    }
    setLoading(true);
    setError("");
    if (from === appliedFrom && to === appliedTo) {
      setReloadToken((current) => current + 1);
      return;
    }
    setAppliedFrom(from);
    setAppliedTo(to);
  };
  const retryReport = () => {
    setLoading(true);
    setError("");
    setReloadToken((current) => current + 1);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">
              <CircleDollarSign size={16} /> Operations / Financial reports
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Financial reports</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              See wallet funding, completed service sales, recorded service costs, estimated profit, and commission balances in one place.
            </p>
          </div>
          <form onSubmit={submitPeriod} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              From
              <span className="relative mt-1 block">
                <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input aria-label="Report start date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </span>
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              To
              <span className="relative mt-1 block">
                <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input aria-label="Report end date" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </span>
            </label>
            <button type="submit" disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition disabled:opacity-60">
              {loading ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Apply
            </button>
          </form>
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={retryReport} className="ml-auto font-semibold underline">Retry</button>
        </div>
      )}

      {hasUncostedRequests && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            <strong>{summary.requestsMissingCost} completed request(s)</strong> have no configured service cost. Add service costs below; where an older request has no saved cost, the configured service cost will be used for reporting.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Report settings</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Service costs</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Set what each service costs your business. This value is only used to calculate profit; it does not change the customer price or charge users.
          </p>
        </div>
        {costEditorError && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{costEditorError}</p>}
        {costEditorSuccess && <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{costEditorSuccess}</p>}
        <form onSubmit={saveServiceCost} className="grid gap-4 md:grid-cols-[minmax(14rem,1.2fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)_auto] md:items-end">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            Service
            <select
              aria-label="Service to update cost"
              value={selectedServiceCode}
              onChange={(event) => {
                const serviceCode = event.target.value;
                const service = catalogServices.find((item) => item.serviceCode === serviceCode);
                setSelectedServiceCode(serviceCode);
                setServiceCostDraft(service?.cost == null ? "" : String(service.cost));
                setCostEditorError("");
                setCostEditorSuccess("");
              }}
              disabled={catalogLoading || !catalogServices.length}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950"
            >
              {!catalogServices.length && <option value="">{catalogLoading ? "Loading services…" : "No services available"}</option>}
              {catalogServices.map((service) => (
                <option key={service.serviceCode} value={service.serviceCode}>
                  {service.name} · {service.category}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Customer price
            <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {selectedService ? formatCurrency(selectedService.price) : "—"}
            </p>
          </div>
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            Cost for profit calculation (₦)
            <input
              aria-label="Cost for profit calculation"
              type="number"
              min="0"
              step="0.01"
              value={serviceCostDraft}
              onChange={(event) => setServiceCostDraft(event.target.value)}
              placeholder="Enter cost"
              disabled={!selectedService || catalogLoading}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <button type="submit" disabled={!selectedService || catalogLoading || savingServiceCost} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60">
            {savingServiceCost ? <LoaderCircle size={16} className="animate-spin" /> : null}
            {savingServiceCost ? "Saving…" : "Save cost"}
          </button>
        </form>
        {selectedService && serviceCostDraft !== "" && Number.isFinite(Number(serviceCostDraft)) && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Indicative margin at the current price: {formatCurrency(Number(selectedService.price || 0) - Number(serviceCostDraft))} per service, before commissions and overhead.
          </p>
        )}
      </section>

      <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Wallet funding received" value={formatCurrency(summary.walletFundingReceived)} help={`${summary.fundingTransactionsReceived || 0} approved funding transaction(s); customer wallet funds, not service profit.`} icon={Wallet} accent="blue" />
        <StatCard label="Pending wallet funding" value={formatCurrency(summary.pendingWalletFunding)} help={`${summary.fundingTransactionsPending || 0} payment(s) waiting for review.`} icon={Banknote} accent="amber" />
        <StatCard label="Completed service sales" value={formatCurrency(summary.completedServiceSales)} help={`${summary.completedRequests || 0} completed service request(s) in this period.`} icon={BriefcaseBusiness} accent="green" />
        <StatCard label="Known service costs" value={formatCurrency(summary.knownServiceCosts)} help="Request-time costs or current catalog costs for completed requests." icon={BadgeDollarSign} accent="rose" />
        <StatCard label="Commissions earned" value={formatCurrency(summary.commissionsEarned)} help="Commissions credited to users in this period; deducted when calculating profit." icon={BadgeDollarSign} accent="violet" />
        <StatCard label="Profit after commissions" value={formatCurrency(summary.profitAfterCommissions)} help={`Sales less known service costs and commissions earned (${formatCurrency(summary.commissionsEarned)}); excludes overhead and unrecorded costs.`} icon={CircleDollarSign} accent={Number(summary.profitAfterCommissions) >= 0 ? "green" : "rose"} />
        <StatCard label="Commission balances due" value={formatCurrency(summary.commissionBalancesDue)} help="Current commission wallet balances across users; not restricted to the selected date range." icon={BadgeDollarSign} accent="violet" />
        <StatCard label="Requests in progress" value={summary.openRequests || 0} help={`${formatCurrency(summary.openRequestValue)} at request price; already paid/credited from customer balances, not additional funding.`} icon={BriefcaseBusiness} accent="amber" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Gross profit before commissions</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(summary.grossProfitBeforeCommissions)}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Completed service sales minus recorded or currently configured direct service costs.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Customer wallet balances</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(summary.customerWalletBalances)}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Current stored wallet balances across customers; a platform liability, not profit.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Service profitability</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sales and known direct costs are attributed to completed requests in the selected period.</p>
          {Number(summary.requestsUsingCurrentCatalogCost || 0) > 0 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Current catalog costs are being applied to {summary.requestsUsingCurrentCatalogCost} completed request(s) that do not have a request-time cost.
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-3 py-3">Service</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Completed</th><th className="px-3 py-3 text-right">Sales</th><th className="px-3 py-3 text-right">Known cost</th><th className="px-3 py-3 text-right">Gross profit*</th><th className="px-3 py-3 text-right">Cost missing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <TableEmpty columns={7}>Loading service totals…</TableEmpty> : report?.serviceBreakdown?.length ? report.serviceBreakdown.map((row) => (
                <tr key={`${row.category}-${row.service}`} className="text-slate-700 dark:text-slate-300">
                  <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{row.service}</td>
                  <td className="px-3 py-3">{row.category}</td>
                  <td className="px-3 py-3">{row.completedCount}</td>
                  <td className="px-3 py-3 text-right">{formatCurrency(row.revenue)}</td>
                  <td className="px-3 py-3 text-right">{formatCurrency(row.knownCost)}</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatCurrency(row.profit)}</td>
                  <td className="px-3 py-3 text-right">{row.missingCostCount || 0}</td>
                </tr>
              )) : <TableEmpty columns={7}>No service requests found for this period.</TableEmpty>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">*Profit is before commissions and overhead. A saved request-time cost is used when available; otherwise, the current catalog cost is applied for historical requests.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Commission balances by recipient</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current balances available to users, with payout details when provided. Account numbers are masked.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <tr><th className="px-3 py-3">Recipient</th><th className="px-3 py-3">Bank / account name</th><th className="px-3 py-3">Account number</th><th className="px-3 py-3 text-right">Balance due</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <TableEmpty columns={4}>Loading commission balances…</TableEmpty> : report?.commissionRecipients?.length ? report.commissionRecipients.map((recipient) => (
                <tr key={recipient.userId}>
                  <td className="px-3 py-3"><div className="font-semibold text-slate-900 dark:text-white">{recipient.name}</div><div className="text-xs text-slate-500 dark:text-slate-400">{recipient.email}</div></td>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{recipient.bankName ? `${recipient.bankName} · ${recipient.accountName}` : "Payout details not provided"}</td>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{recipient.accountNumberMasked || "—"}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(recipient.balance)}</td>
                </tr>
              )) : <TableEmpty columns={4}>There are no current commission balances due.</TableEmpty>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Financial activity</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Wallet funding, service requests, and commission credits for the selected period.</p>
          </div>
          <button
            type="button"
            onClick={() => exportCsv(activity, appliedFrom, appliedTo)}
            disabled={!activity.length || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowDownToLine size={16} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Type / service</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Amount</th><th className="px-3 py-3 text-right">Known cost</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <TableEmpty columns={6}>Loading financial activity…</TableEmpty> : activity.length ? activity.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="text-slate-700 dark:text-slate-300">
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(row.date)}</td>
                  <td className="px-3 py-3"><div className="font-semibold text-slate-900 dark:text-white">{row.type}</div><div className="text-xs text-slate-500 dark:text-slate-400">{row.service}</div></td>
                  <td className="px-3 py-3"><div>{row.user}</div><div className="text-xs text-slate-500 dark:text-slate-400">{row.email}</div></td>
                  <td className="px-3 py-3 capitalize">{row.status}</td>
                  <td className="px-3 py-3 text-right">{formatCurrency(row.revenue)}</td>
                  <td className="px-3 py-3 text-right">{row.cost == null ? "—" : formatCurrency(row.cost)}</td>
                </tr>
              )) : <TableEmpty columns={6}>No financial activity found for this period.</TableEmpty>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Wallet funding appears here for reconciliation but is not counted as service sales or profit.</p>
      </section>
    </main>
  );
}
