import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { toast } from "sonner";
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

const FILTER_OPTIONS = ["All", "NIN", "CAC", "NIMC"];

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-48 animate-pulse rounded-[2rem] bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/70" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-[2rem] bg-slate-200/70 dark:bg-slate-800/70" />
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/10">
        <FileText size={28} className="text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshBalance, walletBalance: contextWalletBalance } = useUser();
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [walletBalanceLocal, setWalletBalance] = useState(contextWalletBalance ?? 0);
  const [requestsData, setRequestsData] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (nextFilter = filter) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const normalizedFilter = nextFilter === "All" ? "" : nextFilter;
      const query = normalizedFilter ? `category=${encodeURIComponent(normalizedFilter)}&limit=5` : "limit=5";

      const balancePromise = api.get("/api/users/balance");
      const requestsPromise = api.get(`/api/service-requests?${query}`);

      const [balanceRes, requestsRes] = await Promise.all([balancePromise, requestsPromise]);
      const balanceValue = balanceRes?.data?.walletBalance ?? contextWalletBalance ?? 0;
      setWalletBalance(balanceValue);

      const data = Array.isArray(requestsRes?.data?.data) ? requestsRes.data.data : [];
      const mappedData = data.map((r) => ({
        ...r,
        category:
          r.category ||
          r.serviceCategory ||
          (r.type === "cac_registration" || r.type === "cac" || String(r.service || "").toLowerCase().includes("cac")
            ? "CAC"
            : String(r.service || "").toLowerCase().includes("nimc")
            ? "NIMC"
            : "NIN"),
      }));

      setRequestsData(mappedData);
      setStats({
        total: mappedData.length,
        completed: mappedData.filter((r) => ["completed", "approved", "success", "successful"].includes(String(r.status || "").toLowerCase())).length,
        pending: mappedData.filter((r) => ["pending", "processing", "in-progress"].includes(String(r.status || "").toLowerCase())).length,
      });
    } catch (err) {
      console.error("🔥 DASHBOARD SYNC ERROR:", err);
      setRequestsData([]);
      setStats({ total: 0, completed: 0, pending: 0 });
      toast.error("We couldn't load your recent requests right now.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, contextWalletBalance, filter]);

  useEffect(() => {
    fetchData(filter);
  }, [filter, fetchData]);

  return (
    <div className="max-w-7xl mx-auto pt-4">
      <PageHeader
        title={`Welcome back, ${user?.firstName || "User"} 👋`}
        subtitle="Manage verifications, requests and transactions from one secure dashboard."
      />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0F172A] via-[#172554] to-[#2563EB] p-8 text-white shadow-2xl mb-8"
      >
        <div className="absolute -top-20 right-0 w-72 h-72 bg-blue-400/20 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
          <div>
            <p className="text-white/70 text-sm mb-3">Available Wallet Balance</p>
            <h1 className="text-6xl font-black tracking-tight">{loading ? "..." : formatNaira(walletBalanceLocal)}</h1>
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
        <StatCard title="Wallet Balance" value={formatNaira(walletBalanceLocal)} icon={<Wallet size={20} />} color="purple" />
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
            onClick={() => navigate("/verify-nin")}
          />
          <ActionButton
            title="NIMC Services"
            icon={FileText}
            onClick={() => navigate("/nin-services")}
          />
          <ActionButton
            title="CAC Services"
            icon={FileText}
            onClick={() => navigate("/cac-services")}
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
        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border border-slate-200/70 dark:border-slate-700/70 rounded-3xl p-6 md:p-8 shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recent Activity</h2>
          <div className="flex gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {requestsData.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description={filter === "All" ? "Start by creating your first verification request." : `No ${filter.toLowerCase()} requests were found for this account.`}
              actionLabel={filter === "All" ? "Create Request" : "Reset Filter"}
              onAction={() => {
                if (filter === "All") {
                  navigate("/verify-nin");
                } else {
                  setFilter("All");
                }
              }}
            />
          ) : (
            <>
              {requestsData.map((activity) => {
                const latestUpdate = Array.isArray(activity.statusHistory) ? activity.statusHistory[0] : null;
                const rawStatus = String(activity.status || latestUpdate?.status || latestUpdate?.note || "").toLowerCase();
                const statusLabel = rawStatus.includes("complete") || rawStatus.includes("success")
                  ? "Completed"
                  : rawStatus.includes("pending")
                  ? "Pending"
                  : rawStatus.includes("process")
                  ? "Processing"
                  : rawStatus.includes("fail") || rawStatus.includes("reject")
                  ? "Failed"
                  : activity.status || "Unknown";
                const statusBadge = statusLabel === "Completed"
                  ? "bg-green-100 text-green-800"
                  : statusLabel === "Pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : statusLabel === "Processing"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-red-100 text-red-800";
                const statusIcon = statusLabel === "Completed" ? "✅" : statusLabel === "Pending" ? "⏳" : statusLabel === "Processing" ? "⚙️" : "❌";
                const latestNote = latestUpdate?.note || activity.status || "No update yet";

                return (
                  <motion.div
                    key={activity._id || activity.id}
                    whileHover={{ x: 4 }}
                    className="flex flex-col gap-4 p-4 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors cursor-pointer dark:bg-slate-800/70 dark:hover:bg-slate-700/70"
                    onClick={() => navigate(`/verify-result/${activity._id}`)}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{activity.service || activity.type || "Service Request"}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate">{activity.nin ? `NIN: ${activity.nin}` : activity.serviceCategory || activity.category || "NIMC"}</p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          <span>{statusIcon}</span>
                          <span>{statusLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(activity.createdAt || activity.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500">Amount</p>
                        <p className="font-semibold mt-1">₦{Number(activity.amount || 0).toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500">Pipeline</p>
                        <p className="font-semibold mt-1">{activity.serviceCategory || activity.category || "NIMC"}</p>
                      </div>
                      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500">Latest Log</p>
                        <p className="font-semibold mt-1 truncate">{latestNote}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </div>

        {requestsData.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate(`/my-requests${filter !== "All" ? `?filter=${encodeURIComponent(filter)}` : ""}`)}
              className="text-blue-600 font-semibold hover:text-blue-800 transition flex items-center gap-2"
            >
              View All Requests →
            </motion.button>
          </div>
        )}
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
          value={formatNaira(walletBalanceLocal * 0.02)}
          icon={<TrendingUp size={20} className="text-blue-600" />}
          subtitle="Promotional credits"
        />
      </motion.div>
        </>
      )}
    </div>
  );
}