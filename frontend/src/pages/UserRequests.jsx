import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios";
import { useUser } from "../context/UserContext";
import { SERVICE_TYPE_OPTIONS } from "../config/serviceTypes";

export default function UserRequests() {
  // =========================
  // STATE
  // =========================
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [active, setActive] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState("");
  const [nin, setNin] = useState("");
  const [search, setSearch] = useState("");

  // =========================
  // API CALL
  // =========================
  const apiRequests = async (pageNum = 1, append = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "10"
      });

      if (category) params.set("category", category);
      if (nin) params.set("nin", nin);
      if (search) params.set("search", search);

      const res = await api.get(`/api/service-requests?${params.toString()}`);
      const newData = res.data?.data || [];

      if (append) {
        setRequests((prev) => [
          ...prev,
          ...newData.filter((item) => !prev.some((p) => p._id === item._id)),
        ]);
      } else {
        setRequests(newData);
      }

      const currentPage = res.data?.page || 1;
      const totalPages = res.data?.totalPages || 1;
      setHasMore(currentPage < totalPages);
      setPage(currentPage);
    } catch (err) {
      console.error("REQUEST api ERROR:", err.response?.data || err.message);
      setRequests([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      apiRequests(1);
    }
  }, [user?.id]);

  const applyFilters = () => {
    setPage(1);
    setHasMore(true);
    apiRequests(1, false);
  };

  const clearFilters = () => {
    setCategory("");
    setNin("");
    setSearch("");
    setPage(1);
    setHasMore(true);
    apiRequests(1, false);
  };

  const loadMore = async () => {
    if (loadingMore) return;
    await apiRequests(page + 1, true);
  };

  // =========================
  // UI HELPERS
  // =========================
  const statusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "processing": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
      case "success":
      case "successful": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "failed":
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const statusText = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return "⏳ Waiting for Review";
      case "processing": return "⚙️ In Progress";
      case "completed":
      case "success":
      case "successful": return "✅ Completed";
      case "failed":
      case "rejected": return "❌ Failed";
      default: return status;
    }
  };

  // =========================
  // LOADING STATE
  // =========================
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)]">Requests</h1>
        <p className="text-[var(--muted)] mt-2">Track your submitted NIN services and processing updates</p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1.2fr_0.8fr_1fr_auto_auto]">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {SERVICE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={nin}
          onChange={(e) => setNin(e.target.value)}
          placeholder="Filter by NIN"
          className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by service or ID"
          className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button onClick={applyFilters} className="btn-primary">Apply</button>
        <button onClick={clearFilters} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Clear</button>
      </div>

      {requests.length === 0 && (
        <div className="card-ui p-10 text-center border-dashed border-2">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-semibold mb-2">No Requests Yet</h2>
          <p className="text-gray-500">Your submitted requests will appear here</p>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((r) => (
          <div
            key={r._id}
            onClick={() => setActive(r)}
            className="card-ui p-5 cursor-pointer hover:scale-[1.01] transition-all duration-200 border shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-lg capitalize">{r.service}</p>
                  <span className="text-gray-400">•</span>
                  <p className="capitalize text-gray-600">{r.type}</p>
                  {r.serviceCategory && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs">{r.serviceCategory}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-2">NIN: {r.nin}</p>
              </div>
              <div className="md:text-right">
                <p className="text-2xl font-bold text-blue-600">₦{Number(r.amount || 0).toLocaleString()}</p>
                <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${statusStyle(r.status)}`}>
                  {statusText(r.status)}
                </span>
                <div className="mt-3 text-right">
                  <Link
                    to={`/verify-result/${r._id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    View Result
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && requests.length > 0 && (
        <div className="text-center mt-8">
          <button onClick={loadMore} disabled={loadingMore} className="btn-primary">
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {/* MODAL */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-[var(--card)] text-[var(--text)] rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border">
            <div className="sticky top-0 bg-[var(--card)] border-b p-5 flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-bold capitalize">{active.service}</h2>
                <p className="text-sm text-gray-500 capitalize">{active.type}</p>
              </div>
              <button onClick={() => setActive(null)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 transition">✕</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusStyle(active.status)}`}>
                  {statusText(active.status)}
                </span>
                <p className="font-bold text-2xl text-blue-600">₦{Number(active.amount || 0).toLocaleString()}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Detail label="NIN" value={active.nin} />
                <Detail label="Service" value={active.service} />
                <Detail label="Category" value={active.serviceCategory || "NIMC"} />
                <Detail label="Type" value={active.type} />
                <Detail label="Created" value={new Date(active.createdAt).toLocaleString()} />
              </div>

              {active.formData && Object.keys(active.formData).length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4">Submitted Information</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(active.formData).map(([k, v]) => (
                      <div key={k} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border">
                        <p className="text-xs text-gray-500 capitalize">{k}</p>
                        <p className="font-medium break-words">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {active.statusHistory?.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4">Progress Timeline</h3>
                  <div className="space-y-4">
                    {active.statusHistory.map((s, i) => {
                      const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
                      const safeNote = s.note ? s.note.replace(emailRegex, (m) => (s.actorRole || 'admin')) : '';
                      return (
                        <div key={i} className="flex gap-4">
                          <div className="w-3 h-3 bg-blue-600 rounded-full mt-2" />
                          <div>
                            <p className="font-semibold capitalize">{s.status} {s.actorRole ? `· ${s.actorRole}` : ''}</p>
                            <p className="text-sm text-gray-500">{safeNote}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(s.createdAt || s.date).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {active.comments?.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4">Conversation</h3>
                  <div className="space-y-3">
                    {active.comments.map((c, i) => (
                      <div key={i} className={`p-4 rounded-2xl ${c.role === "admin" ? "bg-gray-100 dark:bg-gray-800" : "bg-blue-100 text-blue-900"}`}>
                        <p className="text-xs font-bold mb-1">{c.by}</p>
                        <p className="text-sm">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {typeof active.proof === "string" && active.proof.startsWith("http") && (
                <div>
                  <h3 className="font-bold text-lg mb-4">Payment Proof</h3>
                  <img src={active.proof} alt="proof" className="w-full rounded-2xl border" />
                </div>
              )}

              {active.status === "completed" && active.resultSlip && (
                <a href={active.resultSlip} download className="block text-center btn-primary">📥 Download Result Slip</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold break-words">{value || "-"}</p>
    </div>
  );
}