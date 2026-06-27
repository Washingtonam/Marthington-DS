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
    const targetId = user?.id || user?._id;
    if (!targetId) return;

    setLoading(true);
    try {
      const normalizedFilter = nextFilter === "All" ? "" : nextFilter;
      const query = normalizedFilter ? `?category=${encodeURIComponent(normalizedFilter)}&limit=5` : "?limit=5";

      const balancePromise = api.get("/api/users/balance");
      const requestsPromise = api.get(`/api/cac/user-requests/${targetId}${query}`);

      let balanceRes;
      let requestsRes;

      try {
        [balanceRes, requestsRes] = await Promise.all([balancePromise, requestsPromise]);
      } catch (err) {
        if (err?.response?.status === 404) {
          try {
            balanceRes = await balancePromise;
            const hist = await api.get(`/api/cac/history${normalizedFilter ? `?category=${encodeURIComponent(normalizedFilter)}` : ""}`);
            requestsRes = { data: Array.isArray(hist.data) ? hist.data.filter((r) => String(r.userId) === String(targetId)) : [] };
          } catch (fallbackError) {
            console.error("Fallback CAC history failed:", fallbackError);
            balanceRes = await balancePromise.catch(() => ({ data: { walletBalance: 0 } }));
            requestsRes = { data: [] };
          }
        } else {
          throw err;
        }
      }

      const balanceValue = balanceRes?.data?.walletBalance ?? contextWalletBalance ?? 0;
      setWalletBalance(balanceValue);

      const data = Array.isArray(requestsRes?.data) ? requestsRes.data : [];
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
        completed: mappedData.filter((r) => ["completed", "approved"].includes(String(r.status || "").toLowerCase())).length,
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
  }, [user, contextWalletBalance]);

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
                  navigate("/services/nin");
                } else {
                  setFilter("All");
                }
              }}
            />
          ) : (
            <>
              {requestsData.map((activity) => (
                <motion.div
                  key={activity._id || activity.id}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors cursor-pointer dark:bg-slate-800/70 dark:hover:bg-slate-700/70"
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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{activity.title || activity.service || activity.type}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{activity.description || activity.message || activity.status}</p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {activity.updatedAt ? new Date(activity.updatedAt).toLocaleDateString() : activity.time || "Recent"}
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>

        {/* View All Requests Button */}
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