import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Clock3, CheckCircle2, XCircle, Zap, FileText, BadgeDollarSign, UserCheck } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { adminGetPaymentsLedger, adminApprovePayment, adminRejectPayment } from "../../services/api";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected"];
const STATUS_BADGES = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  success: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  failed: "bg-rose-100 text-rose-700",
  other: "bg-slate-100 text-slate-700",
};

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const formatDate = (value) => new Date(value).toLocaleString();

export default function AdminPayments() {
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState({
    totalVolume: 0,
    totalCount: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    failed: 0,
    other: 0,
    statusBreakdown: {},
    sourceBreakdown: {},
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const { success, error } = useToast();

  const activeSummaryCards = [
    { title: "Total Volume", value: formatCurrency(summary.totalVolume), icon: <BadgeDollarSign size={22} className="text-slate-700" /> },
    { title: "Pending", value: summary.pending, icon: <Clock3 size={22} className="text-yellow-700" /> },
    { title: "Approved", value: summary.approved, icon: <CheckCircle2 size={22} className="text-emerald-700" /> },
    { title: "Rejected", value: summary.rejected, icon: <XCircle size={22} className="text-rose-700" /> },
  ];

  const sourceBreakdown = useMemo(() => Object.entries(summary.sourceBreakdown || {}), [summary.sourceBreakdown]);

  const formatStatusLabel = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "success" || normalized === "successful" || normalized === "approved") return "Approved";
    if (normalized === "failed" || normalized === "rejected") return "Rejected";
    if (normalized === "pending") return "Pending";
    return status?.toString()?.toUpperCase() || "OTHER";
  };

  const showStatus = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "success" || normalized === "successful") return "approved";
    if (normalized === "failed") return "rejected";
    return normalized || "other";
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const response = await adminGetPaymentsLedger({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter,
        search: searchQuery,
      });

      if (response?.success) {
        setLedger(response.data || []);
        setSummary(response.summary || {});
        setPagination((prev) => ({
          ...prev,
          page: response.pagination?.page || prev.page,
          pages: response.pagination?.pages || prev.pages,
          total: response.pagination?.total || prev.total,
          limit: response.pagination?.limit || prev.limit,
        }));
      } else {
        setLedger([]);
        setSummary((prev) => ({ ...prev, totalCount: 0 }));
      }
    } catch (err) {
      console.error("ADMIN LEDGER FETCH ERROR:", err);
      setLedger([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [pagination.page, pagination.limit, statusFilter, searchQuery]);

  const handleApprove = async (transactionId) => {
    if (!transactionId) return;
    setActionLoading(true);
    setActionTarget(transactionId);

    try {
      await adminApprovePayment(transactionId);
      success("Payment approved and wallet funded successfully.");
      fetchLedger();
    } catch (err) {
      console.error("APPROVE ERROR:", err);
      error(err.response?.data?.message || err.message || "Failed to approve payment.");
    } finally {
      setActionLoading(false);
      setActionTarget(null);
    }
  };

  const handleReject = async (transactionId) => {
    if (!transactionId) return;
    setActionLoading(true);
    setActionTarget(transactionId);

    try {
      await adminRejectPayment(transactionId);
      success("Payment rejected successfully.");
      fetchLedger();
    } catch (err) {
      console.error("REJECT ERROR:", err);
      error(err.response?.data?.message || err.message || "Failed to reject payment.");
    } finally {
      setActionLoading(false);
      setActionTarget(null);
    }
  };

  const onSearch = (event) => {
    event.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearchQuery(searchInput.trim());
  };

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Premium Payment Ledger</h1>
        <p className="text-blue-100 max-w-3xl">
          View wallet funding history, funding sources, admin approval status, and quick transaction metrics for every payment event.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-4 mb-8">
        {activeSummaryCards.map((card) => (
          <div key={card.title} className="bg-white rounded-3xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">{card.title}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] mb-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Payment Ledger</h2>
              <p className="text-sm text-slate-500">Filtered by status, user, reference, or description.</p>
            </div>
            <form onSubmit={onSearch} className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
              <label className="sr-only" htmlFor="search">Search ledger</label>
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search reference, user, or note"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                Search
              </button>
            </form>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${statusFilter === status ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"}`}
              >
                {status === "all" ? "All Statuses" : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-left">
              <thead>
                <tr className="text-sm text-slate-500">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="bg-slate-50">
                      <td colSpan="5" className="px-4 py-5">
                        <div className="h-4 w-full rounded-full bg-slate-200 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : ledger.length ? (
                  ledger.map((payment) => (
                    <tr
                      key={payment._id}
                      onClick={() => payment.proof && setPreview(payment.proof)}
                      className={`bg-white shadow-sm rounded-3xl border border-slate-200 ${payment.proof ? "cursor-pointer hover:bg-slate-50" : ""}`}
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(payment.createdAt)}</td>
                      <td className="px-4 py-4 text-sm text-slate-800">
                        <div className="font-semibold">{payment.userEmail || "Unknown"}</div>
                        <div className="text-xs text-slate-500">{payment.userRole || "user"}</div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{payment.paymentSource || "Unknown"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGES[showStatus(payment.status)] || STATUS_BADGES.other}`}>
                          {formatStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 space-x-2">
                        {showStatus(payment.status) === "pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(payment._id);
                              }}
                              disabled={actionLoading && actionTarget === payment._id}
                              className="rounded-2xl bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(payment._id);
                              }}
                              disabled={actionLoading && actionTarget === payment._id}
                              className="rounded-2xl bg-rose-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">
                      No ledger records match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Showing {ledger.length} of {summary.totalCount || 0} records</p>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 p-2">
              <button
                onClick={() => changePage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-slate-700">{pagination.page} / {pagination.pages}</span>
              <button
                onClick={() => changePage(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Source Breakdown</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Top Funding Channels</h3>
              </div>
            </div>
            {sourceBreakdown.length ? (
              <div className="space-y-3">
                {sourceBreakdown.map(([source, stats]) => (
                  <div key={source} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold text-slate-800">{source}</span>
                      <span className="text-sm text-slate-500">{stats.count} tx</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 text-sm text-slate-600">
                      <span>Volume: {formatCurrency(stats.total)}</span>
                      <span>Share: {Math.round((stats.total / (summary.totalVolume || 1)) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                No source breakdown available yet.
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="rounded-2xl bg-blue-100 p-3 text-blue-700"><FileText size={20} /></span>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Ledger Notes</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Transaction status and source logic</h3>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-7">
              The ledger includes funding and wallet credit events with pending, approved, rejected, and failed statuses. Click any transaction to inspect proof directly.
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <span className="font-semibold">Funding sources</span>: Flutterwave, Paystack, Manual Receipt, Bank Transfer, Wallet Deposit.
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <span className="font-semibold">Status checks</span>: Only active funding flows are shown here, with financial ledger totals and source risk metrics.
              </div>
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button onClick={() => setPreview(null)} className="absolute right-6 top-6 rounded-2xl bg-white px-4 py-2 font-semibold text-slate-900">Close</button>
          <img src={preview} alt="Payment Proof" className="max-h-[85vh] rounded-3xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

