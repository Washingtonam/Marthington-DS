import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { 
  ShieldCheck, 
  Wallet, 
  FileText, 
  CreditCard,
  Send,
  TrendingUp,
  Settings,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { formatNaira } from "../../lib/currency";

import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import ActionButton from "../../components/ui/ActionButton";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshBalance, walletBalance } = useUser();
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [walletBalanceLocal, setWalletBalance] = useState(walletBalance ?? 0);
  const [requestsData, setRequestsData] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?._id && !user?.id) return;
    
    setLoading(true);
    try {
      const targetId = user.id || user._id;
      
      // Try to fetch balance and user-specific CAC requests. If the user-requests endpoint is missing,
      // fall back to the general CAC history and filter by userId.
      const balancePromise = api.get("/api/users/balance");
      let requestsPromise = api.get(`/api/cac/user-requests/${targetId}`);

      let balanceRes, requestsRes;
      try {
        [balanceRes, requestsRes] = await Promise.all([balancePromise, requestsPromise]);
      } catch (err) {
        // If user-requests 404s, fallback to /api/cac/history and filter
        if (err?.response?.status === 404) {
          try {
            balanceRes = await balancePromise;
            const hist = await api.get(`/api/cac/history`);
            requestsRes = { data: (hist.data || []).filter(r => String(r.userId) === String(targetId)) };
          } catch (err2) {
            console.error("Fallback CAC history failed:", err2);
            balanceRes = await balancePromise.catch(() => ({ data: { walletBalance: 0 } }));
            requestsRes = { data: [] };
          }
        } else {
          // Other errors – log and default
          console.error("DASHBOARD SYNC ERROR (parallel):", err);
          balanceRes = await balancePromise.catch(() => ({ data: { walletBalance: 0 } }));
          requestsRes = { data: [] };
        }
      }

      // Update Balance (Using walletBalance)
      setWalletBalance(balanceRes.data.walletBalance ?? walletBalance ?? 0);

      const data = requestsRes.data || [];
      const mappedData = data.map((r) => ({
        ...r,
        category:
          r.category ||
          r.serviceCategory ||
          (r.type === "cac_registration" || r.type === "cac" || String(r.service || "").toLowerCase().includes("cac") ? "CAC" : "NIN"),
      }));

      setRequestsData(mappedData);
      setStats({
        total: mappedData.length,
        completed: mappedData.filter(r => ["completed", "approved"].includes(r.status)).length,
        pending: mappedData.filter(r => ["pending", "processing"].includes(r.status)).length,
      });
    } catch (err) {
      console.error("🔥 DASHBOARD SYNC ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [user, refreshBalance]);

  const filteredActivity = useMemo(() => {
    if (filter === "All") return requestsData.slice(0, 5);
    return requestsData.filter((item) => item.category === filter).slice(0, 5);
  }, [filter, requestsData]);

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
            <p className="text-white/70 text-sm mb-3">Available Wallet Balance</p>
            <h1 className="text-6xl font-black tracking-tight">{loading ? "..." : formatNaira(walletBalance)}</h1>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => navigate("/wallet")} className="bg-white text-blue-700 hover:bg-gray-100 font-bold px-6 py-2.5 rounded-xl">Fund Wallet</Button>
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
        <StatCard title="Wallet Balance" value={formatNaira(walletBalance)} icon={<Wallet size={20} />} color="purple" />
      </div>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-10"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionButton
            title="Verify NIN"
            icon={ShieldCheck}
            onClick={() => navigate("/services/nin")}
          />
          <ActionButton
            title="NIMC Services"
            icon={FileText}
            onClick={() => navigate("/services/nimc")}
          />
          <ActionButton
            title="CAC Services"
            icon={FileText}
            onClick={() => navigate("/services/cac")}
          />
          <ActionButton
            title="Wallet"
            icon={Wallet}
            onClick={() => navigate("/wallet")}
          />
        </div>
      </motion.div>

      {/* Recent Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/50 backdrop-blur-lg border border-white/20 rounded-3xl p-6 md:p-8 shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
          <div className="flex gap-2">
            {['All', 'NIN', 'CAC'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {requestsData.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <FileText size={28} className="text-blue-600" />
              </div>
              <p className="text-gray-600 font-medium">No requests yet</p>
              <p className="text-gray-500 text-sm mt-1">Start by creating your first verification request</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/services/nin")}
                className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Create Request
              </motion.button>
            </div>
          ) : (
            <>
              {filteredActivity.map((activity) => (
                <motion.div
                  key={activity._id || activity.id}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer"
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      activity.status === "completed"
                        ? "bg-green-100"
                        : activity.status === "pending"
                        ? "bg-amber-100"
                        : "bg-orange-100"
                    }`}
                  >
                    {activity.status === "completed" ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : activity.status === "pending" ? (
                      <Clock size={20} className="text-amber-600" />
                    ) : (
                      <AlertCircle size={20} className="text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{activity.title || activity.service || activity.type}</h3>
                    <p className="text-sm text-gray-600 mt-1">{activity.description || activity.message || activity.status}</p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-gray-500 whitespace-nowrap">
                    {activity.updatedAt ? new Date(activity.updatedAt).toLocaleDateString() : activity.time || "Recent"}
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* Premium Glass Stats Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 grid md:grid-cols-3 gap-5"
      >
        <StatCard
          glassEffect
          title="Success Rate"
          value="98.5%"
          icon={<TrendingUp size={20} className="text-blue-600" />}
          subtitle="Last 30 days"
        />
        <StatCard
          glassEffect
          title="Avg Processing Time"
          value="2.4h"
          icon={<Clock size={20} className="text-blue-600" />}
          subtitle="Per request"
        />
        <StatCard
          glassEffect
          title="Total Saved"
          value={formatNaira(walletBalance * 0.02)}
          icon={<TrendingUp size={20} className="text-blue-600" />}
          subtitle="Promotional credits"
        />
      </motion.div>
    </div>
  );
}