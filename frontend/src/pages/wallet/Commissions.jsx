import React, { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Building2, Calculator, CircleHelp, Loader2, Save } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";

export default function Commissions() {
  const [summary, setSummary] = useState({ balance: 0, services: [], history: [], payoutDetails: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payoutError, setPayoutError] = useState("");
  const [payoutNotice, setPayoutNotice] = useState("");
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ bankName: "", accountName: "", accountNumber: "" });
  const [serviceCode, setServiceCode] = useState("");
  const [requestCount, setRequestCount] = useState("1");

  useEffect(() => {
    let active = true;
    api.get("/api/users/commission")
      .then(({ data }) => {
        if (!active) return;
        const services = Array.isArray(data?.services) ? data.services : [];
        setSummary({
          balance: Number(data?.balance || 0),
          services,
          history: Array.isArray(data?.history) ? data.history : [],
          payoutDetails: data?.payoutDetails || null,
        });
        setPayoutForm({
          bankName: data?.payoutDetails?.bankName || "",
          accountName: data?.payoutDetails?.accountName || "",
          accountNumber: "",
        });
        setServiceCode(services[0]?.serviceCode || "");
      })
      .catch((requestError) => {
        console.error("LOAD COMMISSIONS ERROR:", requestError);
        if (active) setError(requestError.response?.data?.message || "Unable to load your commission details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const savePayoutDetails = async (event) => {
    event.preventDefault();
    setPayoutError("");
    setPayoutNotice("");
    setPayoutSaving(true);
    try {
      const response = await api.put("/api/users/commission/payout-details", payoutForm);
      setSummary((current) => ({ ...current, payoutDetails: response.data.payoutDetails }));
      setPayoutForm((current) => ({ ...current, accountNumber: "" }));
      setPayoutNotice(response.data.message || "Bank details saved for commission payouts.");
    } catch (saveError) {
      console.error("PAYOUT DETAILS SAVE ERROR:", saveError);
      setPayoutError(saveError.response?.data?.message || "Unable to save bank details.");
    } finally {
      setPayoutSaving(false);
    }
  };

  const selectedService = useMemo(
    () => summary.services.find((service) => service.serviceCode === serviceCode),
    [serviceCode, summary.services],
  );
  const commissionPerRequest = selectedService
    ? selectedService.commissionType === "PERCENTAGE"
      ? selectedService.price * selectedService.commissionValue / 100
      : selectedService.commissionValue
    : 0;
  const estimatedCommission = commissionPerRequest * Math.max(0, Number(requestCount) || 0);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Earnings</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Commissions</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Track commissions earned on completed eligible service requests and estimate what a service could earn.
          </p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading commission details…
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(var(--accent-rgb),0.06)] p-6 dark:bg-slate-900">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span className="rounded-xl bg-[rgba(var(--accent-rgb),0.12)] p-2 text-[var(--accent-text)]">
                  <BadgeDollarSign size={20} aria-hidden="true" />
                </span>
                Available commission balance
              </div>
              <p className="mt-5 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">{formatNaira(summary.balance)}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Commission is credited after an eligible request is completed.</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Calculator size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">Commission calculator</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Estimate earnings from your service rates.</p>
                </div>
              </div>
              {summary.services.length ? (
                <>
                  <label htmlFor="commission-service" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Service</label>
                  <select
                    id="commission-service"
                    value={serviceCode}
                    onChange={(event) => setServiceCode(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {summary.services.map((service) => (
                      <option key={service.serviceCode} value={service.serviceCode}>{service.name} · {service.category}</option>
                    ))}
                  </select>
                  <div className="mt-4 grid grid-cols-[1fr,auto] items-end gap-4">
                    <div>
                      <label htmlFor="commission-count" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Completed requests</label>
                      <input
                        id="commission-count"
                        type="number"
                        min="1"
                        max="100000"
                        step="1"
                        value={requestCount}
                        onChange={(event) => setRequestCount(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    <p className="pb-2 text-right text-xl font-bold text-[var(--accent-text)]">{formatNaira(estimatedCommission)}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {selectedService?.commissionType === "PERCENTAGE"
                      ? `${selectedService.commissionValue}% of ${formatNaira(selectedService.price)} per completed request`
                      : `${formatNaira(selectedService?.commissionValue || 0)} per completed request`}
                  </p>
                </>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                  No active service commission rates are configured yet. Check back after rates are added.
                </p>
              )}
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-xl bg-[rgba(var(--accent-rgb),0.1)] p-2.5 text-[var(--accent-text)]"><Building2 size={21} aria-hidden="true" /></span>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Commission payout bank account</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Save the bank account you want to use for commission payouts. Transfers are not yet processed through the platform.</p>
              </div>
            </div>
            {summary.payoutDetails && (
              <div className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                Saved payout account: <strong>{summary.payoutDetails.accountName}</strong>, {summary.payoutDetails.bankName}, account ending in {summary.payoutDetails.accountNumberMasked.slice(-4)}.
              </div>
            )}
            {payoutError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{payoutError}</p>}
            {payoutNotice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{payoutNotice}</p>}
            <form onSubmit={savePayoutDetails} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Bank name
                <input required maxLength={100} autoComplete="organization" value={payoutForm.bankName} onChange={(event) => setPayoutForm((current) => ({ ...current, bankName: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" placeholder="e.g. First Bank" />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Account holder name
                <input required maxLength={120} autoComplete="name" value={payoutForm.accountName} onChange={(event) => setPayoutForm((current) => ({ ...current, accountName: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" placeholder="Name on bank account" />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">10-digit account number
                <input required inputMode="numeric" pattern="[0-9]{10}" minLength={10} maxLength={10} autoComplete="off" value={payoutForm.accountNumber} onChange={(event) => setPayoutForm((current) => ({ ...current, accountNumber: event.target.value.replace(/\D/g, "").slice(0, 10) }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" placeholder={summary.payoutDetails ? `Re-enter to update · ending ${summary.payoutDetails.accountNumberMasked.slice(-4)}` : "Enter account number"} />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={payoutSaving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60">
                  {payoutSaving ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                  {payoutSaving ? "Saving bank details…" : "Save payout account"}
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Commission history</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your latest commission credits.</p>
              </div>
              <Link to="/transactions" className="text-sm font-semibold text-[var(--accent-text)] hover:underline">View transactions</Link>
            </div>
            {summary.history.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.history.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{entry.description}</p>
                      <p className="mt-1 text-xs text-slate-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Date unavailable"}</p>
                    </div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">+{formatNaira(entry.amount)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-3 px-5 py-8 text-sm text-slate-600 dark:text-slate-400">
                <CircleHelp size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                No commission credits yet. Eligible commissions appear here after the related service request is completed.
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
