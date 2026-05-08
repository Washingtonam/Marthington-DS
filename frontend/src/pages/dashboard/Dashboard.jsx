import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useEffect, useState } from "react";
import axios from "axios";
 
import {
  ShieldCheck,
  Wallet,
  FileText,
  CreditCard,
  ArrowRight,
} from "lucide-react";

import { motion } from "framer-motion";

import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";

const API = "https://xcombinator.onrender.com";

export default function Dashboard() {

  const navigate = useNavigate();

  const { user, units, refreshUnits } = useUser();

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  const [recent, setRecent] = useState([]);

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {

    if (user?.id) {

      refreshUnits();

      fetchRequests();
    }

  }, [user]);

  // =========================
  // FETCH REQUESTS
  // =========================
  const fetchRequests = async () => {

    try {

      const res = await axios.get(
        `${API}/api/user/requests/${user.id}`
      );

      const data = res.data || [];

      setRecent(data.slice(0, 4));

      setStats({
        total: data.length,
        completed: data.filter(
          r => r.status === "completed"
        ).length,

        pending: data.filter(
          r => r.status === "pending"
        ).length,
      });

    } catch (err) {

      console.error(err);
    }
  };

  return (

    <div className="max-w-7xl mx-auto">

      {/* HEADER */}
      <PageHeader
        title={`Welcome back, ${user?.firstName || "User"} 👋`}
        subtitle="Manage verifications, requests and transactions from one secure dashboard."
      />

      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0F172A] via-[#172554] to-[#2563EB] p-8 text-white shadow-2xl mb-8"
      >

        {/* GLOW */}
        <div className="absolute -top-20 right-0 w-72 h-72 bg-blue-400/20 blur-3xl rounded-full" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">

          {/* LEFT */}
          <div>

            <p className="text-white/70 text-sm mb-3">
              Available Units
            </p>

            <h1 className="text-6xl font-black tracking-tight">
              {units}
            </h1>

            <p className="mt-4 text-white/70 max-w-md">
              Your verification balance is active and ready for secure transactions.
            </p>

            <div className="flex gap-3 mt-6 flex-wrap">

              <Button
                onClick={() => navigate("/wallet")}
                className="bg-white text-blue-700 hover:bg-gray-100"
              >
                Buy Units
              </Button>

              <Button
                onClick={() => navigate("/my-requests")}
                className="bg-white/10 border border-white/20"
              >
                View Requests
              </Button>

            </div>

          </div>

          {/* RIGHT */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[280px]">

            <h3 className="font-semibold text-lg mb-5">
              Platform Status
            </h3>

            <div className="space-y-4 text-sm">

              <div className="flex justify-between">
                <span className="text-white/70">
                  Verification System
                </span>

                <span className="text-green-300">
                  Online
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-white/70">
                  Requests Processed
                </span>

                <span>
                  {stats.total}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-white/70">
                  Completed
                </span>

                <span>
                  {stats.completed}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-white/70">
                  Pending
                </span>

                <span>
                  {stats.pending}
                </span>
              </div>

            </div>

          </div>

        </div>

      </motion.div>

      {/* STATS */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">

        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={<FileText size={22} />}
          color="blue"
        />

        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<ShieldCheck size={22} />}
          color="green"
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<CreditCard size={22} />}
          color="red"
        />

        <StatCard
          title="Units"
          value={units}
          icon={<Wallet size={22} />}
          color="purple"
        />

      </div>

      {/* QUICK ACTIONS */}
      <div className="mb-10">

        <div className="flex items-center justify-between mb-5">

          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Quick Actions
          </h2>

          <button className="text-blue-600 text-sm flex items-center gap-1">
            View All
            <ArrowRight size={16} />
          </button>

        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">

          {[
            {
              title: "Verify NIN",
              icon: "🆔",
              path: "/verify-nin",
            },

            {
              title: "NIN Services",
              icon: "🏦",
              path: "/nin-services",
            },

            {
              title: "My Requests",
              icon: "📦",
              path: "/my-requests",
            },

            {
              title: "Transactions",
              icon: "📜",
              path: "/transactions",
            },

          ].map((item) => (

            <motion.div
              whileHover={{ y: -5 }}
              key={item.title}
            >

              <Card
                className="cursor-pointer hover:shadow-2xl transition-all"
                onClick={() => navigate(item.path)}
              >

                <div className="text-4xl mb-4">
                  {item.icon}
                </div>

                <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">
                  {item.title}
                </h3>

                <p className="text-sm text-gray-500">
                  Access and manage this service quickly.
                </p>

              </Card>

            </motion.div>

          ))}

        </div>

      </div>

      {/* RECENT ACTIVITY */}
      <Card>

        <div className="flex justify-between items-center mb-6">

          <div>

            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Recent Activity
            </h2>

            <p className="text-sm text-gray-500">
              Latest account actions and requests
            </p>

          </div>

        </div>

        {recent.length === 0 && (
          <p className="text-gray-500">
            No recent activity
          </p>
        )}

        <div className="space-y-4">

          {recent.map((r) => (

            <div
              key={r._id}
              className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4"
            >

              <div>

                <p className="font-semibold text-gray-800 dark:text-white">
                  {r.service} - {r.type}
                </p>

                <p className="text-sm text-gray-500">
                  {new Date(r.createdAt).toLocaleString()}
                </p>

              </div>

              <span className={`
                px-3 py-1 rounded-full text-xs font-medium
                ${
                  r.status === "completed"
                    ? "bg-blue-100 text-blue-700"

                    : r.status === "approved"
                    ? "bg-green-100 text-green-700"

                    : r.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"

                    : "bg-red-100 text-red-700"
                }
              `}>
                {r.status}
              </span>

            </div>

          ))}

        </div>

      </Card>

      {/* TRUST */}
      <div className="mt-10">

        <Card>

          <div className="flex items-start gap-4">

            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>

            <div>

              <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">
                Secure & Trusted Platform
              </h3>

              <p className="text-sm text-gray-500 leading-relaxed">
                Your requests are processed securely with encrypted verification systems,
                transparent tracking and real-time updates.
              </p>

            </div>

          </div>

        </Card>

      </div>

    </div>
  );
}