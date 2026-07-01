import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios";
import { useUser } from "../context/UserContext";

export default function VerificationRequests() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [nin, setNin] = useState("");
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const loadRequests = async (pageNum = 1, append = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({ page: String(pageNum), limit: "10" });
      if (nin) params.set("nin", nin);
      if (search) params.set("search", search);

      const res = await api.get(`/api/verification-requests?${params.toString()}`);
      const data = res.data?.data || [];

      setRequests((prev) => (append ? [...prev, ...data.filter((item) => !prev.some((p) => p._id === item._id))] : data));
      const currentPage = res.data?.page || 1;
      const totalPages = res.data?.totalPages || 1;
      setHasMore(currentPage < totalPages);
      setPage(currentPage);
    } catch (err) {
      console.error("Verification requests error", err);
      setRequests([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadRequests(1);
  }, [user?.id]);

  const applyFilters = () => {
    setPage(1);
    setHasMore(true);
    loadRequests(1, false);
  };

  const clearFilters = () => {
    setNin("");
    setSearch("");
    setPage(1);
    setHasMore(true);
    loadRequests(1, false);
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading verification requests...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Verification Requests</h1>
        <p className="text-slate-500 mt-2">Track identity verification submissions separately from NIMC and CAC services.</p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
        <input value={nin} onChange={(e) => setNin(e.target.value)} placeholder="Filter by NIN" className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search method or ID" className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" />
        <button onClick={applyFilters} className="btn-primary">Apply</button>
        <button onClick={clearFilters} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">Clear</button>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-slate-500">No verification requests found yet.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request._id} className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold capitalize">{request.method || "verification"}</h2>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Verification</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{new Date(request.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-2">NIN: {request.nin || "N/A"}</p>
                </div>
                <div className="md:text-right">
                  <p className="text-2xl font-bold text-blue-600">₦{Number(request.amount || 0).toLocaleString()}</p>
                  <div className="mt-3">
                    <Link to={`/verify-result/${request._id}`} className="text-sm font-semibold text-blue-600 hover:underline">View Result</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && requests.length > 0 && (
        <div className="text-center mt-8">
          <button onClick={() => loadRequests(page + 1, true)} disabled={loadingMore} className="btn-primary">
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
