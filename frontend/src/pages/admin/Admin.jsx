import { useEffect, useState } from "react";

import axios from "axios";
 
import { useNavigate } from "react-router-dom";

import {
  Users,
  Wallet,
  CreditCard,
  Activity,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function Admin() {

  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    pendingPayments: 0,
    totalBalance: 0,
  });

  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));

  const headers = {
    email: user?.email,
  };

  // =========================
  //  api
  // =========================
  const apiStats = async () => {

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
     apiStats();
  }, []);

  // =========================
  // CARDS
  // =========================
  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: <Users size={24} />,
      color: "from-blue-600 to-indigo-600",
    },

    {
      title: "Total Balance",
      value: `₦${stats.totalBalance?.toLocaleString()}`,
      icon: <Wallet size={24} />,
      color: "from-green-600 to-emerald-600",
    },

    {
      title: "Transactions",
      value: stats.totalTransactions,
      icon: <Activity size={24} />,
      color: "from-purple-600 to-fuchsia-600",
    },

    {
      title: "Pending Payments",
      value: stats.pendingPayments,
      icon: <CreditCard size={24} />,
      color: "from-red-600 to-orange-500",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">

      {/* HERO */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-8 md:p-10 text-white shadow-2xl mb-8">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

          <div>

            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={22} />
              <span className="uppercase tracking-widest text-sm opacity-80">
                ADMIN CONTROL CENTER
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Welcome Back, Admin
            </h1>

            <p className="text-blue-100 max-w-2xl">
              Manage users, monitor payments, control pricing,
              and oversee all platform operations from one place.
            </p>

          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 min-w-[260px] border border-white/10">

            <p className="text-sm text-blue-100 mb-2">
              Pending Approvals
            </p>

            <h2 className="text-5xl font-bold mb-3">
              {stats.pendingPayments}
            </h2>

            <button
              onClick={() => navigate("/admin/payments")}
              className="bg-white text-slate-900 px-5 py-3 rounded-2xl font-semibold hover:scale-[1.02] transition flex items-center gap-2"
            >
              Review Now
              <ArrowRight size={18} />
            </button>

          </div>

        </div>

      </div>

      {/* LOADING */}
      {loading && (

        <div className="bg-white dark:bg-[#161616] rounded-3xl p-10 text-center shadow-xl">

          <p className="text-gray-500 dark:text-gray-400">
            Loading dashboard...
          </p>

        </div>

      )}

      {/* STATS */}
      {!loading && (

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

          {cards.map((card, index) => (

            <div
              key={index}
              className={`bg-gradient-to-br ${card.color} rounded-3xl p-6 text-white shadow-xl`}
            >

              <div className="flex items-center justify-between mb-6">

                <div className="bg-white/15 p-3 rounded-2xl">
                  {card.icon}
                </div>

              </div>

              <p className="text-sm opacity-80 mb-2">
                {card.title}
              </p>

              <h2 className="text-3xl font-bold">
                {card.value}
              </h2>

            </div>

          ))}

        </div>

      )}

      {/* QUICK ACTIONS */}
      <div className="mb-10">

        <div className="flex items-center justify-between mb-5">

          <div>

            <h2 className="text-2xl font-bold dark:text-white">
              Quick Actions
            </h2>

            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Fast access to admin operations
            </p>

          </div>

        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* USERS */}
          <ActionCard
            title="Manage Users"
            desc="View, suspend, delete and manage all users"
            icon="👥"
            color="from-blue-600 to-indigo-600"
            onClick={() => navigate("/admin/users")}
          />

          {/* PAYMENTS */}
          <ActionCard
            title="Payment Requests"
            desc="Approve or reject payment submissions"
            icon="💳"
            color="from-red-600 to-orange-500"
            badge={stats.pendingPayments}
            onClick={() => navigate("/admin/payments")}
          />

          {/* PRICING */}
          <ActionCard
            title="Pricing Control"
            desc="Update pricing, verification and service fees"
            icon="💰"
            color="from-green-600 to-emerald-600"
            onClick={() => navigate("/admin/pricing")}
          />

        </div>

      </div>

      {/* ALERT */}
      {stats.pendingPayments > 0 && (

        <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-6 rounded-3xl shadow-xl">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div className="flex items-start gap-3">

              <AlertTriangle size={28} />

              <div>

                <h3 className="font-bold text-xl mb-1">
                  Pending Payment Requests
                </h3>

                <p className="text-red-100">
                  You currently have {stats.pendingPayments} payment request(s)
                  waiting for approval.
                </p>

              </div>

            </div>

            <button
              onClick={() => navigate("/admin/payments")}
              className="bg-white text-red-600 px-6 py-3 rounded-2xl font-semibold hover:scale-[1.02] transition"
            >
              Review Payments
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

/* ACTION CARD */
function ActionCard({
  title,
  desc,
  icon,
  color,
  onClick,
  badge,
}) {

  return (

    <div
      onClick={onClick}
      className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300"
    >

      <div className={`bg-gradient-to-r ${color} p-6 text-white relative`}>

        {badge > 0 && (
          <div className="absolute top-4 right-4 bg-white text-red-600 text-xs font-bold px-3 py-1 rounded-full">
            {badge}
          </div>
        )}

        <div className="text-4xl mb-4">
          {icon}
        </div>

        <h3 className="text-xl font-bold">
          {title}
        </h3>

      </div>

      <div className="p-6">

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {desc}
        </p>

        <div className="mt-5 flex items-center gap-2 text-blue-600 font-semibold">
          Open Section
          <ArrowRight size={18} />
        </div>

      </div>

    </div>

  );
}