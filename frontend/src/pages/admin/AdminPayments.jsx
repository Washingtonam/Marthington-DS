import { useEffect, useState } from "react";
import axios from "axios";
import {
  CreditCard,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Eye,
  BadgeDollarSign,
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [unitPrice, setUnitPrice] = useState(215); // Default to matching platform unit base price
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [preview, setPreview] = useState(null);

  // =========================
  // PAGINATION STATE
  // =========================
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

  const user = JSON.parse(localStorage.getItem("user"));
  const headers = {
    email: user?.email,
  };

  // =========================
  // FETCH PAYMENTS
  // =========================
  const fetchPayments = async () => {
    try {
      setLoading(true);
      // Pointed explicitly to the updated /api/admin/payments route
      const res = await axios.get(
        `${API_BASE}/api/admin/payments`,
        { headers }
      );

      // Handle raw array response or structure backup safely
      const dataArray = Array.isArray(res.data) ? res.data : res.data?.data || [];
      
      // Apply frontend filtering safely to handle layout filters seamlessly
      const filteredData = filter === "all" 
        ? dataArray 
        : dataArray.filter(p => p.status === filter);

      setPayments(filteredData);
      
      // Calculate layout pagination parameters locally if backend returns unpaginated payload array
      setPages(res.data?.pagination?.pages || Math.ceil(filteredData.length / LIMIT) || 1);
    } catch (err) {
      console.error(
        "FETCH ERROR:",
        err.response?.data || err.message
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FETCH PRICING
  // =========================
  const fetchPricing = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/pricing`);
      setUnitPrice(res.data?.nin?.unitPrice || 215);
    } catch (err) {
      console.error("PRICING ERROR:", err);
    }
  };

  // =========================
  // APPROVE REQUEST
  // =========================
  const approve = async (id) => {
    if (!window.confirm("Are you sure you want to APPROVE this payment request?")) return;
    try {
      setLoadingId(id);
      const res = await axios.post(
        `${API_BASE}/api/admin/payments/${id}/approve`,
        {},
        { headers }
      );
      alert(res.data.message || "Approved successfully");
      fetchPayments();
    } catch (err) {
      console.error(
        "APPROVE ERROR:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.message || "Approval failed");
    } finally {
      setLoadingId(null);
    }
  };

  // =========================
  // REJECT REQUEST
  // =========================
  const reject = async (id) => {
    if (!window.confirm("Are you sure you want to REJECT this payment request?")) return;
    try {
      setLoadingId(id);
      const res = await axios.post(
        `${API_BASE}/api/admin/payments/${id}/reject`,
        {},
        { headers }
      );
      alert(res.data.message || "Rejected successfully");
      fetchPayments();
    } catch (err) {
      console.error(
        "REJECT ERROR:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.message || "Rejection failed");
    } finally {
      setLoadingId(null);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, filter]);

  useEffect(() => {
    fetchPricing();
  }, []);

  // =========================
  // STATUS BADGE STYLING
  // =========================
  const statusStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 font-semibold";
      case "approved":
        return "bg-green-100 text-green-700 font-semibold";
      case "rejected":
        return "bg-red-100 text-red-700 font-semibold";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // =========================
  // METRICS COMPUTATION
  // =========================
  const pendingCount = payments.filter(p => p.status === "pending").length;
  const approvedCount = payments.filter(p => p.status === "approved").length;
  const totalAmount = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Paginate filtered array subset locally
  const startIndex = (page - 1) * LIMIT;
  const paginatedPayments = payments.slice(startIndex, startIndex + LIMIT);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={20} />
              <span className="uppercase tracking-widest text-sm opacity-80">
                PAYMENT MANAGEMENT
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3">
              Payment Requests
            </h1>
            <p className="text-blue-100 max-w-2xl">
              Review wallet funding requests, approve unit allocations,
              and manage customer payment submissions efficiently.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10 min-w-[260px]">
            <p className="text-sm text-blue-100 mb-2">Current Unit Price</p>
            <h2 className="text-5xl font-bold">₦{unitPrice}</h2>
          </div>
        </div>
      </div>

      {/* METRICS DASHBOARD CARD row */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-2">Pending Payments</p>
              <h2 className="text-4xl font-bold dark:text-white">{pendingCount}</h2>
            </div>
            <div className="bg-yellow-100 p-4 rounded-2xl">
              <Clock3 className="text-yellow-700" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-2">Approved</p>
              <h2 className="text-4xl font-bold dark:text-white">{approvedCount}</h2>
            </div>
            <div className="bg-green-100 p-4 rounded-2xl">
              <CheckCircle2 className="text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-2">Total Filtered Volume</p>
              <h2 className="text-4xl font-bold dark:text-white">₦{totalAmount.toLocaleString()}</h2>
            </div>
            <div className="bg-blue-100 p-4 rounded-2xl">
              <BadgeDollarSign className="text-blue-700" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL TABS */}
      <div className="flex gap-3 flex-wrap mb-8">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-5 py-3 rounded-2xl text-sm font-semibold transition ${
              filter === f
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-[#161616] dark:text-white border border-gray-200 dark:border-gray-800 hover:shadow-md"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* CONDITIONAL VIEW LAYOUT */}
      {loading && (
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading payments...</p>
        </div>
      )}

      {!loading && paginatedPayments.length === 0 && (
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">No payments found matching this category.</p>
        </div>
      )}

      {!loading && paginatedPayments.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedPayments.map((p) => {
            const calculatedUnits = p.units || Math.floor(p.amount / unitPrice);

            return (
              <div
                key={p._id}
                className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col justify-between"
              >
                {/* HEAD DETAILS BLOCK */}
                <div>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-white/20 p-2 rounded-xl">
                            <CreditCard size={18} />
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full ${statusStyle(p.status)}`}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                        <h2 className="font-semibold text-sm break-all">
                          {p.userId?.email || "Unknown User"}
                        </h2>
                      </div>
                      {p.proof && (
                        <button
                          onClick={() => setPreview(p.proof)}
                          className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DATA CARD INTERIOR FIELDS */}
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between border-b pb-2 border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Amount Sent</span>
                      <span className="font-bold dark:text-white">₦{p.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Target Value Units</span>
                      <span className="font-bold text-blue-600">+{calculatedUnits} Units</span>
                    </div>
                    {p.userId?.units !== undefined && (
                      <div className="flex justify-between pb-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Current Balance</span>
                        <span className="font-medium text-slate-700 dark:text-gray-300">{p.userId.units} Units</span>
                      </div>
                    )}

                    {p.proof && (
                      <div className="mt-4">
                        <img
                          src={p.proof}
                          alt="Payment snapshot proof"
                          loading="lazy"
                          onClick={() => setPreview(p.proof)}
                          className="w-full h-40 object-cover rounded-2xl border cursor-pointer hover:opacity-90 transition"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM CTA BUTTON ACTION AREA */}
                {p.status === "pending" && (
                  <div className="p-5 pt-0 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => approve(p._id)}
                      disabled={loadingId === p._id}
                      className={`py-3 rounded-2xl text-white font-semibold transition flex items-center justify-center gap-2 ${
                        loadingId === p._id ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      <CheckCircle2 size={18} />
                      {loadingId === p._id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => reject(p._id)}
                      disabled={loadingId === p._id}
                      className={`py-3 rounded-2xl text-white font-semibold transition flex items-center justify-center gap-2 ${
                        loadingId === p._id ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STRUCTURAL PAGINATION ELEMENT CONTROL */}
      {!loading && pages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 dark:text-white px-5 py-3 rounded-2xl disabled:opacity-50 flex items-center gap-2 transition"
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-semibold shadow-md">
            Page {page} of {pages}
          </div>
          <button
            disabled={page === pages}
            onClick={() => setPage((prev) => Math.min(prev + 1, pages))}
            className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 dark:text-white px-5 py-3 rounded-2xl disabled:opacity-50 flex items-center gap-2 transition"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* FULL-SCREEN OVERLAY MODAL INTERFACE */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="relative max-w-4xl w-full flex flex-col items-end">
            <button
              onClick={() => setPreview(null)}
              className="mb-3 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-2xl shadow-lg transition"
            >
              Close Preview
            </button>
            <img
              src={preview}
              alt="Expanded payment tracking attachment view"
              className="w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl bg-slate-900"
            />
          </div>
        </div>
      )}
    </div>
  );
}