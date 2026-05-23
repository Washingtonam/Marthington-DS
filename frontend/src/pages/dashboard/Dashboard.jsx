import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios"; // Standardized axios instance
import { ShieldCheck, Wallet, FileText, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUnits } = useUser();
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [currentUnits, setCurrentUnits] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?._id && !user?.id) return;
    
    setLoading(true);
    try {
      const targetId = user.id || user._id;
      
      // Removed "/api" prefix from these calls because baseURL in axios.js already includes it
      const [balanceRes, requestsRes] = await Promise.all([
        api.post("/balance", { email: user.email }),
        api.get(`/user/requests/${targetId}`)
      ]);

      // Update Balance
      const latestUnits = balanceRes.data.units ?? balanceRes.data.balance ?? 0;
      setCurrentUnits(latestUnits);
      if (refreshUnits) refreshUnits();

      // Update Stats
      const data = requestsRes.data || [];
      setStats({
        total: data.length,
        completed: data.filter(r => ["completed", "approved"].includes(r.status)).length,
        pending: data.filter(r => ["pending", "processing"].includes(r.status)).length,
      });
    } catch (err) {
      console.error("🔥 DASHBOARD SYNC ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [user, refreshUnits]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-7xl mx-auto pt-4">
      <PageHeader
        title={`Welcome back, ${user?.firstName || "User"} 👋`}
        subtitle="Manage verifications, requests and transactions from one secure dashboard."
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0F172A] via-[#172554] to-[#2563EB] p-8 text-white shadow-2xl mb-8"
      >
        <div className="absolute -top-20 right-0 w-72 h-72 bg-blue-400/20 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
          <div>
            <p className="text-white/70 text-sm mb-3">Available Wallet Tokens</p>
            <h1 className="text-6xl font-black tracking-tight">{loading ? "..." : currentUnits}</h1>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => navigate("/wallet")} className="bg-white text-blue-700 hover:bg-gray-100 font-bold px-6 py-2.5 rounded-xl">Buy Units</Button>
              <Button onClick={() => navigate("/my-requests")} className="bg-white/10 border border-white/20 text-white px-6 py-2.5 rounded-xl">View Requests</Button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[280px]">
            <h3 className="font-semibold mb-4 tracking-wide">Platform Status</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Verification System</span>
                <span className="text-green-300 font-semibold bg-green-500/20 px-2 py-0.5 rounded-md text-xs">Online</span>
              </div>
              <div className="flex justify-between"><span className="text-white/70">Requests Processed</span><span className="font-medium">{stats.total}</span></div>
              <div className="flex justify-between"><span className="text-white/70">Completed Tasks</span><span className="text-blue-200 font-medium">{stats.completed}</span></div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        <StatCard title="Total Requests" value={stats.total} icon={<FileText size={20} />} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={<ShieldCheck size={20} />} color="green" />
        <StatCard title="Pending" value={stats.pending} icon={<CreditCard size={20} />} color="red" />
        <StatCard title="Wallet Balance" value={currentUnits} icon={<Wallet size={20} />} color="purple" />
      </div>
    </div>
  );
}