import React, { useEffect, useState, useCallback } from "react";
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
import Card from "../../components/ui/Card";
import Grid from "../../components/ui/Grid";
import Section from "../../components/ui/Section";
import Badge from "../../components/ui/Badge";
import ActivityCard from "./ActivityCard";

const FILTER_OPTIONS = ["All", "NIN", "CAC", "NIMC"];

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
  const { user, walletBalance: contextWalletBalance } = useUser();
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [requestsData, setRequestsData] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [verifyNinEnabled, setVerifyNinEnabled] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    const loadAvailableServices = async () => {
      const [categoriesResult, pricingResult] = await Promise.allSettled([
        api.get("/api/services/categories"),
        api.get("/api/pricing"),
      ]);

      if (categoriesResult.status === "fulfilled") {
        const categories = Array.isArray(categoriesResult.value.data?.categories)
          ? categoriesResult.value.data.categories.filter((category) => category?.isActive !== false && category?.slug)
          : [];
        if (!cancelled) setServiceCategories(categories);
      } else {
        console.error("Dashboard service categories fetch failed:", categoriesResult.reason);
      }

      if (pricingResult.status === "fulfilled") {
        if (!cancelled) {
          setVerifyNinEnabled(pricingResult.value.data?.platformServices?.verifyNin?.enabled !== false);
        }
      } else {
        console.error("Dashboard platform services fetch failed:", pricingResult.reason);
      }
    };

    void loadAvailableServices();
    return () => { cancelled = true; };
  }, []);

  const serviceActions = [
    ...(verifyNinEnabled ? [{
      title: "Verify NIN",
      icon: ShieldCheck,
      onClick: () => navigate("/verify-nin"),
    }] : []),
    ...serviceCategories.map((category) => {
      const slug = String(category.slug).toLowerCase();
      const target = slug === "nin" || slug === "nimc"
        ? "/nin-services"
        : slug === "cac"
          ? "/cac-services"
          : `/services/${slug}`;
      return {
        title: `${category.label} Services`,
        icon: FileText,
        onClick: () => navigate(target),
      };
    }),
    {
      title: "Wallet",
      icon: Wallet,
      onClick: () => navigate("/wallet"),
    },
  ];

  const fetchData = useCallback(async (nextFilter = filter) => {
    if (!user?.id) return;

    try {
      const normalizedFilter = nextFilter === "All" ? "" : nextFilter;
      const query = normalizedFilter ? `category=${encodeURIComponent(normalizedFilter)}&limit=5` : "limit=5";
      const requestsRes = await api.get(`/api/users/requests/history?${query}`);

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
    }
  }, [user?.id, filter]);

  useEffect(() => {
    fetchData(filter);
  }, [filter, fetchData]);

  return (
    <div className="max-w-7xl mx-auto pt-4">
      <PageHeader
        title={`Welcome back, ${user?.firstName || "User"} 👋`}
        subtitle="Manage verifications, requests and transactions from one secure dashboard."
      />

      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        Earn extra profit on every completed request! Commissions are automatically credited to your wallet once processing is finished.
      </div>

      <>
          <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-[2rem] p-8 shadow-2xl"
        style={{
          background: "linear-gradient(125deg, var(--accent), var(--accent-strong))",
          color: "var(--accent-foreground)",
        }}
      >
        <div className="absolute -top-20 right-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: "rgba(var(--accent-rgb), 0.3)" }} />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
          <div>
            <p className="text-sm opacity-80 mb-3">Available Wallet Balance</p>
            <h1 className="text-6xl font-black tracking-tight">{formatNaira(contextWalletBalance ?? 0)}</h1>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => navigate("/wallet")} className="rounded-xl px-6 py-2.5 font-bold text-[var(--accent-text)]" style={{ backgroundColor: "#ffffff" }}>Fund Wallet</Button>
              <Button onClick={() => navigate("/my-requests")} className="rounded-xl border px-6 py-2.5" style={{ backgroundColor: "rgba(var(--accent-rgb), 0.14)", borderColor: "color-mix(in srgb, var(--accent-foreground) 35%, transparent)", color: "var(--accent-foreground)" }}>View Requests</Button>
            </div>
          </div>

          <div className="rounded-3xl border p-6 min-w-[280px] backdrop-blur-xl" style={{ backgroundColor: "color-mix(in srgb, var(--accent-foreground) 10%, transparent)", borderColor: "color-mix(in srgb, var(--accent-foreground) 18%, transparent)" }}>
            <h3 className="font-semibold mb-4 tracking-wide">Platform Status</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="opacity-75">Verification System</span>
                <span className="text-green-300 font-semibold bg-green-500/20 px-2 py-0.5 rounded-md text-xs">Online</span>
              </div>
              <div className="flex justify-between"><span className="opacity-75">Requests Processed</span><span className="font-medium">{stats.total}</span></div>
              <div className="flex justify-between"><span className="opacity-75">Completed Tasks</span><span className="font-medium">{stats.completed}</span></div>
            </div>
          </div>
        </div>
      </motion.div>

      <Grid cols="4" gap="5" className="mb-10">
        <StatCard title="Total Requests" value={stats.total} icon={<FileText size={20} />} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={<ShieldCheck size={20} />} color="green" />
        <StatCard title="Pending" value={stats.pending} icon={<CreditCard size={20} />} color="red" />
        <StatCard title="Wallet Balance" value={formatNaira(contextWalletBalance ?? 0)} icon={<Wallet size={20} />} color="purple" />
      </Grid>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-10"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {serviceActions.map((action) => (
            <ActionButton
              key={action.title}
              title={action.title}
              icon={action.icon}
              onClick={action.onClick}
            />
          ))}
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
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : statusLabel === "Pending"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  : statusLabel === "Processing"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
                const statusIcon = statusLabel === "Completed" ? "✅" : statusLabel === "Pending" ? "⏳" : statusLabel === "Processing" ? "⚙️" : "❌";

                return (
                  <ActivityCard
                    key={activity._id || activity.id}
                    activity={activity}
                    statusLabel={statusLabel}
                    statusBadgeColor={statusBadge}
                    statusIcon={statusIcon}
                  />
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
      >
        <Grid cols="3" gap="5" className="mt-10">
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
            value={formatNaira((contextWalletBalance ?? 0) * 0.02)}
            icon={<TrendingUp size={20} className="text-blue-600" />}
            subtitle="Promotional credits"
          />
        </Grid>
      </motion.div>
      </>
    </div>
  );
}