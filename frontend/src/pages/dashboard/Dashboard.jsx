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
    if (user?.id || user?._id) {
      refreshUnits();
      fetchRequests();
    }
  }, [user]);

  // =========================
  // FETCH REQUESTS
  // =========================
  const fetchRequests = async () => {
    try {
      const targetId = user.id || user._id;
      const res = await axios.get(`${API}/api/user/requests/${targetId}`);
      const data = res.data || [];

      setRecent(data.slice(0, 4));

      setStats({
        total: data.length,
        completed: data.filter(r => r.status === "completed" || r.status === "approved").length,
        pending: data.filter(r => r.status === "pending" || r.status === "processing").length,
      });
    } catch (err) {
      console.error("Dashboard metric fetch error:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pt-4">
      {/* HEADER */}
      <PageHeader
        title={`Welcome back, ${user?.firstName || "User"} 👋`}
        subtitle="Manage verifications, requests and transactions from one secure dashboard."
      />

      {/* HERO BANNER SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0F172A] via-[#172554] to-[#2563EB] p-8 text-white shadow-2xl mb-8"
      >
        {/* LIGHT GLOW BLUR */}
        <div className="absolute -top-20 right-0 w-72 h-72 bg-blue-400/20 blur-3xl rounded-full" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
          {/* LEFT経済 COLUMN */}
          <div>
            <p className="text-white/70 text-sm mb-3">Available Wallet Tokens</p>
            <h1 className="text-6xl font-black tracking-tight">{units}</h1>
            <p className="mt-4 text-white/70 max-w-md text-sm leading-relaxed">
              Your verification balance is active and ready for secure transactions.
            </p>
            <div className="flex gap-3 mt-6 flex-wrap">
              <Button onClick={() => navigate("/wallet")} className="bg-white text-blue-700 hover:bg-gray-100 font-bold px-6 py-2.5 rounded-xl transition">
                Buy Units
              </Button>
              <Button onClick={() => navigate("/my-requests")} className="bg-white/10 border border-white/20 text-white font-medium px-6 py-2.5 rounded-xl transition">
                View Requests
              </Button>
            </div>
          </div>

          {/* RIGHT METRICS LOG BLOCK */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[280px]">
            <h3 className="font-semibold text-base mb-4 tracking-wide">Platform Status</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Verification System</span>
                <span className="text-green-300 font-semibold bg-green-500/20 px-2 py-0.5 rounded-md text-xs">Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Requests Processed</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Completed Tasks</span>
                <span className="text-blue-200 font-medium">{stats.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Pending Approval</span>
                <span className="text-yellow-200 font-medium">{stats.pending}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CORE STATS HIGHLIGHT COMPONENT GRID */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        <StatCard title="Total Requests" value={stats.total} icon={<FileText size={20} />} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={<ShieldCheck size={20} />} color="green" />
        <StatCard title="Pending" value={stats.pending} icon={<CreditCard size={20} />} color="red" />
        <StatCard title="Wallet Balance" value={units} icon={<Wallet size={20} />} color="purple" />
      </div>

      {/* QUICK ACTIONS ACTIONS DASHBOARD NAVIGATION HUB */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Quick Actions</h2>
          <button onClick={() => navigate("/nin-services")} className="text-blue-600 text-sm font-semibold flex items-center gap-1 hover:underline">
            View NIMC Services
            <ArrowRight size={16} />
          </button>
        </div>

        {/* 🔥 UPDATED: Click handlers moved to the outer wrapper for absolute responsiveness */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {[
            { title: "Verify NIN", icon: "🆔", path: "/verify-nin", desc: "Run raw numbers query check validation logs." },
            { title: "NIMC Services", icon: "🏦", path: "/nin-services", desc: "Access adjustments and error clearance hubs." },
            { title: "CAC Services", icon: "🏢", path: "/cac-services", desc: "Launch new corporate or business registrations." },
            { title: "My Requests", icon: "📦", path: "/my-requests", desc: "Track current state and tracking workflow progress." },
            { title: "Transactions", icon: "📜", path: "/transactions", desc: "Verify billing histories and token invoice archives." },
          ].map((item) => (
            <motion.div 
              whileHover={{ y: -4 }} 
              key={item.title} 
              className="h-full group"
              onClick={() => navigate(item.path)} // 🔥 Click event moved here to ensure total click capture
            >
              <Card
                className="cursor-pointer hover:shadow-xl border border-gray-100 dark:border-gray-800 transition-all p-5 rounded-3xl bg-white dark:bg-[#111827] flex flex-col justify-between h-full"
              >
                <div>
                  <div className="text-3xl mb-3.5">{item.icon}</div>
                  <h3 className="font-bold text-base mb-1.5 text-gray-800 dark:text-white tracking-tight">{item.title}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-normal">{item.desc}</p>
                </div>
                {/* Transition opacity helper linked smoothly to parent group hover tracks */}
                <div className="mt-4 pt-2 flex items-center gap-1 text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Launch App <ArrowRight size={12} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* RECENT HISTORICAL ACTIVITY LEDGER SHEETS */}
      <Card className="rounded-[2rem] bg-white dark:bg-[#111827] border-gray-100 dark:border-gray-800 p-6 md:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Recent Activity</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Latest account actions and verified registry transactions</p>
        </div>

        {recent.length === 0 ? (
          <div className="p-8 text-center border rounded-2xl border-dashed border-gray-200 dark:border-gray-800 text-gray-400 text-sm font-medium">
            No transactions or actions logged within recent query sessions.
          </div>
        ) : (
          <div className="space-y-4">
            {recent.map((r) => (
              <div key={r._id} className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800/60 pb-3.5 last:border-0 last:pb-0 transition">
                <div>
                  <p className="font-semibold text-sm text-gray-800 dark:text-slate-200 capitalize">
                    {r.serviceType ? `${r.serviceType.replace("_", " ")} Registration` : `${r.service} - ${r.type}`}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-[10px] uppercase font-bold tracking-wider ${
                  r.status === "completed" || r.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : 
                  r.status === "pending" || r.status === "processing" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" : 
                  "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* PLATFORM SECURITY CARD BADGE */}
      <div className="mt-8 mb-16">
        <Card className="rounded-[2rem] bg-white dark:bg-[#111827] border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-800 dark:text-white mb-1 tracking-tight">Secure & Trusted Verification Platform</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-4xl">
                Your verification records are handled via heavily audited, encrypted, and isolated transaction pathways. Real-time logging maintains strict verification security layout parameters.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}