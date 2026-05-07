import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://xcombinator.onrender.com";

export default function Admin() {

  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    pendingPayments: 0,
    totalBalance: 0
  });

  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));

  const headers = {
    email: user?.email,
  };

  // =========================
  // 🚀 FAST FETCH
  // =========================
  const fetchStats = async () => {

    try {

      setLoading(true);

      const res = await axios.get(
        `${API_BASE}/api/admin/stats`,
        { headers }
      );

      setStats(res.data);

    } catch (err) {
      console.error("STATS ERROR:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // =========================
  // UI
  // =========================
  return (
    <div className="p-6 space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">
          Admin Dashboard
        </h1>

        <p className="text-gray-500 mt-1">
          Manage users, payments, pricing and requests
        </p>
      </div>

      {/* ========================= */}
      {/* LOADING */}
      {/* ========================= */}
      {loading && (
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          Loading dashboard...
        </div>
      )}

      {/* ========================= */}
      {/* STATS */}
      {/* ========================= */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">

          {/* USERS */}
          <div className="bg-white p-5 rounded-2xl shadow border">

            <p className="text-sm text-gray-500 mb-2">
              Total Users
            </p>

            <h2 className="text-3xl font-bold">
              {stats.totalUsers}
            </h2>

          </div>

          {/* BALANCE */}
          <div className="bg-white p-5 rounded-2xl shadow border">

            <p className="text-sm text-gray-500 mb-2">
              Total Balance
            </p>

            <h2 className="text-3xl font-bold text-green-600">
              ₦{stats.totalBalance?.toLocaleString()}
            </h2>

          </div>

          {/* TRANSACTIONS */}
          <div className="bg-white p-5 rounded-2xl shadow border">

            <p className="text-sm text-gray-500 mb-2">
              Transactions
            </p>

            <h2 className="text-3xl font-bold">
              {stats.totalTransactions}
            </h2>

          </div>

          {/* PENDING */}
          <div className="bg-white p-5 rounded-2xl shadow border">

            <p className="text-sm text-gray-500 mb-2">
              Pending Payments
            </p>

            <h2 className="text-3xl font-bold text-red-600">
              {stats.pendingPayments}
            </h2>

          </div>

        </div>
      )}

      {/* ========================= */}
      {/* QUICK ACTIONS */}
      {/* ========================= */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* USERS */}
        <div
          onClick={() => navigate("/admin/users")}
          className="bg-white p-6 rounded-2xl shadow border cursor-pointer hover:shadow-xl transition"
        >

          <h2 className="text-lg font-bold mb-2">
            👥 Manage Users
          </h2>

          <p className="text-sm text-gray-500">
            View, suspend, delete and manage users
          </p>

        </div>

        {/* PAYMENTS */}
        <div
          onClick={() => navigate("/admin/payments")}
          className="bg-white p-6 rounded-2xl shadow border cursor-pointer hover:shadow-xl transition relative"
        >

          <h2 className="text-lg font-bold mb-2">
            💳 Payment Requests
          </h2>

          <p className="text-sm text-gray-500">
            Approve or reject payment submissions
          </p>

          {stats.pendingPayments > 0 && (
            <span className="absolute top-4 right-4 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
              {stats.pendingPayments}
            </span>
          )}

        </div>

        {/* PRICING */}
        <div
          onClick={() => navigate("/admin/pricing")}
          className="bg-white p-6 rounded-2xl shadow border cursor-pointer hover:shadow-xl transition"
        >

          <h2 className="text-lg font-bold mb-2">
            💰 Pricing Control
          </h2>

          <p className="text-sm text-gray-500">
            Update service prices and verification costs
          </p>

        </div>

      </div>

      {/* ========================= */}
      {/* ALERT */}
      {/* ========================= */}
      {stats.pendingPayments > 0 && (

        <div className="bg-red-50 border border-red-200 p-5 rounded-2xl">

          <p className="text-red-700 font-semibold">
            ⚠️ You have {stats.pendingPayments} pending payment request(s)
          </p>

          <button
            onClick={() => navigate("/admin/payments")}
            className="mt-4 bg-red-600 hover:bg-red-700 transition text-white px-5 py-2 rounded-xl"
          >
            Review Payments
          </button>

        </div>

      )}

    </div>
  );
}