import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminPayments() {

  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [unitPrice, setUnitPrice] = useState(250);

  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);

  // =========================
  // PAGINATION
  // =========================
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const LIMIT = 20;

  const user = JSON.parse(localStorage.getItem("user"));

  const headers = {
    email: user?.email,
  };

  // =========================
  // 🚀 FETCH PAYMENTS
  // =========================
  const fetchPayments = async () => {

    try {

      setLoading(true);

      const res = await axios.get(
        `${API_BASE}/api/admin/payments?page=${page}&limit=${LIMIT}&status=${filter}`,
        { headers }
      );

      setPayments(res.data?.data || []);

      setPages(res.data?.pagination?.pages || 1);

    } catch (err) {

      console.error(
        "FETCH ERROR:",
        err.response?.data || err.message
      );

    }

    setLoading(false);
  };

  // =========================
  // 💰 FETCH PRICING
  // =========================
  const fetchPricing = async () => {

    try {

      const res = await axios.get(
        `${API_BASE}/api/pricing`
      );

      setUnitPrice(
        res.data?.nin?.unitPrice || 250
      );

    } catch (err) {

      console.error(
        "PRICING ERROR:",
        err
      );

    }
  };

  // =========================
  // ✅ APPROVE
  // =========================
  const approve = async (id) => {

    try {

      setLoadingId(id);

      const res = await axios.post(
        `${API_BASE}/api/admin/payments/${id}/approve`,
        {},
        { headers }
      );

      alert(
        res.data.message ||
        "Approved successfully"
      );

      fetchPayments();

    } catch (err) {

      console.error(
        "APPROVE ERROR:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
        "Approval failed"
      );

    }

    setLoadingId(null);
  };

  // =========================
  // ❌ REJECT
  // =========================
  const reject = async (id) => {

    try {

      setLoadingId(id);

      const res = await axios.post(
        `${API_BASE}/api/admin/payments/${id}/reject`,
        {},
        { headers }
      );

      alert(
        res.data.message ||
        "Rejected successfully"
      );

      fetchPayments();

    } catch (err) {

      console.error(
        "REJECT ERROR:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
        "Rejection failed"
      );

    }

    setLoadingId(null);
  };

  useEffect(() => {
    fetchPayments();
  }, [page, filter]);

  useEffect(() => {
    fetchPricing();
  }, []);

  // =========================
  // STATUS COLORS
  // =========================
  const statusStyle = (status) => {

    switch (status) {

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "approved":
        return "bg-green-100 text-green-700";

      case "rejected":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="mb-6">

        <h1 className="text-3xl font-bold">
          Payment Requests
        </h1>

        <p className="text-gray-500 mt-1">
          Unit Price: ₦{unitPrice}
        </p>

      </div>

      {/* FILTER */}
      <div className="flex gap-3 flex-wrap mb-6">

        {[
          "all",
          "pending",
          "approved",
          "rejected"
        ].map((f) => (

          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {f.toUpperCase()}
          </button>

        ))}

      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
          Loading payments...
        </div>
      )}

      {/* EMPTY */}
      {!loading && payments.length === 0 && (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
          No payments found
        </div>
      )}

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

        {payments.map((p) => {

          const units = Math.floor(
            p.amount / unitPrice
          );

          return (

            <div
              key={p._id}
              className="bg-white p-5 rounded-2xl shadow border"
            >

              {/* TOP */}
              <div className="flex justify-between items-center mb-3">

                <p className="font-semibold text-sm truncate">
                  {p.userId?.email || "Unknown"}
                </p>

                <span
                  className={`text-xs px-2 py-1 rounded-full ${statusStyle(p.status)}`}
                >
                  {p.status}
                </span>

              </div>

              {/* DETAILS */}
              <p className="text-sm mb-1">
                Amount:
                <b className="ml-1">
                  ₦{p.amount?.toLocaleString()}
                </b>
              </p>

              <p className="text-sm text-blue-600 font-semibold mb-3">
                ≈ {units} units
              </p>

              {/* IMAGE */}
              {p.proof && (
                <img
                  src={p.proof}
                  alt="proof"
                  loading="lazy"
                  className="w-full h-48 object-cover rounded-xl border mb-4"
                />
              )}

              {/* ACTIONS */}
              {p.status === "pending" && (

                <div className="flex gap-2">

                  <button
                    onClick={() => approve(p._id)}
                    disabled={loadingId === p._id}
                    className={`flex-1 py-2 rounded-xl text-white text-sm ${
                      loadingId === p._id
                        ? "bg-gray-400"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >

                    {loadingId === p._id
                      ? "Processing..."
                      : `Approve (+${units})`}

                  </button>

                  <button
                    onClick={() => reject(p._id)}
                    disabled={loadingId === p._id}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm"
                  >
                    Reject
                  </button>

                </div>

              )}

            </div>
          );
        })}
      </div>

      {/* PAGINATION */}
      {!loading && pages > 1 && (

        <div className="flex justify-center items-center gap-3 mt-8">

          <button
            disabled={page === 1}
            onClick={() => setPage(prev => prev - 1)}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>

          <div className="text-sm font-medium">
            Page {page} of {pages}
          </div>

          <button
            disabled={page === pages}
            onClick={() => setPage(prev => prev + 1)}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>

        </div>

      )}

    </div>
  );
}