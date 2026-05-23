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
  const [currentUnits, setCurrentUnits] = useState(units || 0);

  // =========================
  // SYNC UNITS FROM BACKEND
  // =========================
  useEffect(() => {
    const syncData = async () => {
      try {
        // 1. Force refresh from Context
        if (refreshUnits) await refreshUnits();
        
        // 2. Direct Backend Sync to guarantee the number
        const res = await axios.post(`${API}/api/balance`, { email: user?.email });
        if (res.data) {
          const latestUnits = res.data.units ?? res.data.balance ?? 0;
          setCurrentUnits(latestUnits);
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    };

    if (user?.id || user?._id) {
      syncData();
       apiRequests();
    }
  }, [user]);

  // =========================
  //  api REQUESTS
  // =========================
  const apiRequests = async () => {
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
      console.error("Dashboard metric  api error:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pt-4">
      <PageHeader
        title={`Welcome back, ${user?.firstName || "User"} 👋`}
        subtitle="Manage verifications, requests and transactions from one secure dashboard."
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0F172A] via-[#172554] to-[#2563EB] p-8 text-white shadow-2xl mb-8"
      >
        <div className="absolute -top-20 right-0 w-72 h-72 bg-blue-400/20 blur-3xl rounded-full" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
          <div>
            <p className="text-white/70 text-sm mb-3">Available Wallet Tokens</p>
            {/* Using currentUnits state which is forced to sync with API */}
            <h1 className="text-6xl font-black tracking-tight">{currentUnits}</h1>
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

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        <StatCard title="Total Requests" value={stats.total} icon={<FileText size={20} />} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={<ShieldCheck size={20} />} color="green" />
        <StatCard title="Pending" value={stats.pending} icon={<CreditCard size={20} />} color="red" />
        {/* Using currentUnits here as well */}
        <StatCard title="Wallet Balance" value={currentUnits} icon={<Wallet size={20} />} color="purple" />
      </div>

      {/* Quick Actions and Recent Activity sections remain the same ... */}
      {/* (Rest of your code stays as is) */}
    </div>
  );
}