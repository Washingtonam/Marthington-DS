import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { toast } from "sonner";
import { CreditCard, FileText, Users, Wallet, Clock3, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

import Tabs from "../../components/ui/Tabs";
import Card from "../../components/ui/Card";
import Section from "../../components/ui/Section";
import OverviewTab from "./tabs/OverviewTab";
import PaymentsTab from "./tabs/PaymentsTab";
import ToolsTab from "./tabs/ToolsTab";

function DashboardControlCenterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-40 rounded-[1.75rem] bg-slate-200/70 animate-pulse" />
            <div className="h-40 rounded-[1.75rem] bg-slate-200/70 animate-pulse" />
          </div>
        </div>
        <div className="h-56 rounded-[1.75rem] bg-slate-200/70 animate-pulse" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 h-72 rounded-[1.75rem] bg-slate-200/70 animate-pulse" />
        <div className="h-72 rounded-[1.75rem] bg-slate-200/70 animate-pulse" />
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const categories = Object.entries(data || { NIMC: 0, CAC: 0 });
  const maxCount = Math.max(...categories.map(([, value]) => value), 1);

  return (
    <div className="space-y-4">
      {categories.map(([label, value]) => (
        <div key={label} className="space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>{label}</span>
            <span>{value}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${(value / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [overview, setOverview] = useState({});
  const [pricingOverview, setPricingOverview] = useState({});
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [isPricingLoading, setIsPricingLoading] = useState(true);
  const [recentAdminActions, setRecentAdminActions] = useState([]);
  const [search, setSearch] = useState("");
  const [pipelineRequests, setPipelineRequests] = useState([]);
  const [pendingPaymentsList, setPendingPaymentsList] = useState([]);
  const [ninSearch, setNinSearch] = useState("");
  const [ninResults, setNinResults] = useState([]);
  const [ninLoading, setNinLoading] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [visibleEmails, setVisibleEmails] = useState({});
  const [openActionMenu, setOpenActionMenu] = useState(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();

  const isSuperAdminLocal = currentUser.role === 'super_admin';

  const maskEmail = (email) => {
    if (!email) return '**********';
    const [localPart, domain] = String(email).split('@');
    if (!domain) return `${email[0]}*****`;
    return `${localPart[0]}*****@${domain}`;
  };

  const toggleEmailVisibility = (id) => {
    setVisibleEmails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ============================
  // FETCH ADMIN OVERVIEW
  // ============================
  const fetchAdminOverview = async () => {
    setIsOverviewLoading(true);
    try {
      const response = await api.get("/api/admin/stats/overview");
      if (response.data?.success) {
        setOverview(response.data);
      } else {
        setOverview({});
      }
    } catch (error) {
      console.error("🔥 Error fetching admin overview:", error);
      setOverview({});
    } finally {
      setIsOverviewLoading(false);
    }
  };

  const fetchRecentAdminActions = async () => {
    if (!isSuperAdminLocal) {
      setRecentAdminActions([]);
      return;
    }

    try {
      const response = await api.get("/api/admin/audit-logs", { params: { page: 1, limit: 5 } });
      setRecentAdminActions(response.data?.data || []);
    } catch (error) {
      console.error("🔥 Error fetching admin actions:", error);
      setRecentAdminActions([]);
    }
  };

  const fetchPricingOverview = async () => {
    try {
      setIsPricingLoading(true);
      const response = await api.get("/api/pricing");
      setPricingOverview(response.data || {});
    } catch (error) {
      console.error("🔥 Error fetching pricing overview:", error);
      setPricingOverview({});
    } finally {
      setIsPricingLoading(false);
    }
  };

  // ============================
  // FETCH PIPELINE REQUESTS
  // ============================
  const fetchPipelineRequests = async () => {
    try {
      const response = await api.get("/api/admin/requests", {
        params: { page: 1, limit: 20, status: "pending" },
      });
      if (response.data?.success) {
        setPipelineRequests(response.data.data);
      }
    } catch (error) {
      console.error("🔥 Error pulling application stream pipeline:", error);
    }
  };

  const navigate = useNavigate();

  const fetchPendingPayments = async () => {
    try {
      const res = await api.get("/api/admin/payments", { params: { page: 1, limit: 10 } });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const pending = data.filter((p) => String(p.status || "").toLowerCase() === "pending");
      setPendingPaymentsList(pending.slice(0, 10));
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      setPendingPaymentsList([]);
    }
  };

  const handleVerifyNin = async () => {
    if (!ninSearch || ninSearch.trim().length === 0) return;
    setNinLoading(true);
    try {
      const res = await api.get("/api/verification-requests", { params: { nin: ninSearch.trim(), limit: 20, includeServiceRequests: true } });
      const data = res.data?.data || [];
      const filteredData = verificationFilter === "all" ? data : data.filter((r) => String(r.status || "").toLowerCase() === verificationFilter);
      setNinResults(filteredData.map(r => ({
        id: r._id,
        nin: r.nin || "N/A",
        status: (r.status || "unknown").toUpperCase(),
        pipeline: r.source === 'service' ? `Service request (${r.service || r.type || 'request'})` : (r.method ? `Verification (${r.method})` : "Verification"),
        createdAt: r.createdAt,
        request: r,
      })));
      if ((data?.length || 0) > 0) {
        toast.success(`Found ${data.length} matching record(s)`);
      } else {
        toast(`No records found for ${ninSearch}`);
      }
    } catch (err) {
      console.error("NIN verify error:", err);
      setNinResults([]);
      toast.error("Verification lookup failed");
    } finally {
      setNinLoading(false);
    }
  };

  // ============================
  // FETCH USERS
  // ============================
  const fetchUsers = async () => {
    if (!isSuperAdminLocal) {
      setUsers([]);
      return;
    }

    try {
      const response = await api.get("/api/admin/users");
      setUsers(response.data?.data || response.data || []);
    } catch (error) {
      console.error("🔥 Error fetching users registry directory:", error);
    }
  };

  // ============================
  // FETCH STATS
  // ============================
  const fetchStats = async () => {
    if (!isSuperAdminLocal) {
      setStats({});
      return;
    }

    try {
      const response = await api.get("/api/admin/stats");
      setStats(response.data);
    } catch (error) {
      console.error("🔥 Error gathering metrics telemetry:", error);
    }
  };

  // ============================
  // SEARCH USERS
  // ============================
  const handleSearch = async () => {
    if (!search) return fetchUsers();
    try {
      const response = await api.get(`/api/admin/users`, {
        params: { search: search },
      });
      setUsers(response.data?.data || response.data || []);
    } catch (error) {
      console.error("🔥 Search sequence failure execution:", error);
    }
  };

  // ============================
  // LIFECYCLE MANAGEMENT ACTIONS
  // ============================
  const suspendUser = async (id) => {
    try {
      await api.put(`/api/admin/user/${id}/suspend`);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error("🔥 Suspend routine failure:", error);
    }
  };

  const activateUser = async (id) => {
    try {
      await api.put(`/api/admin/user/${id}/activate`);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error("🔥 Activation routine failure:", error);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this user account context profile?")) return;
    try {
      await api.delete(`/api/admin/user/${id}`);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error("🔥 Identity destruction failure execution loop:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchPipelineRequests();
    fetchAdminOverview();
    fetchRecentAdminActions();
    fetchPendingPayments();
    fetchPricingOverview();
  }, []);

  return (
    <div className="max-w-7xl mx-auto pt-4">
      {/* Header */}
      <Section
        title="Admin Control Center"
        subtitle="System overview, requests, payments, and verification tools"
        className="mb-8"
      />

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-800 to-blue-600 text-white p-6 mb-8 shadow-lg"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm mb-2">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-lg font-semibold">All Systems Nominal</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">
            <Zap size={16} />
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      {isOverviewLoading ? (
        <DashboardControlCenterSkeleton />
      ) : (
        <Tabs
          tabs={[
            {
              label: "Overview",
              icon: <Wallet size={16} />,
              content: (
                <OverviewTab
                  stats={stats}
                  pipelineRequests={pipelineRequests}
                  pendingPaymentsList={pendingPaymentsList}
                  overview={overview}
                />
              ),
            },
            {
              label: "Payments",
              icon: <CreditCard size={16} />,
              badge: pendingPaymentsList.length,
              content: (
                <PaymentsTab
                  pendingPaymentsList={pendingPaymentsList}
                  loading={false}
                />
              ),
            },
            {
              label: "Verification Tools",
              icon: <ShieldCheck size={16} />,
              content: <ToolsTab />,
            },
            {
              label: "Requests",
              icon: <FileText size={16} />,
              badge: pipelineRequests.length,
              content: (
                <Card variant="default">
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p className="mb-4">
                      View and manage pending service requests
                    </p>
                    <button
                      onClick={() => navigate("/admin/requests")}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Open Requests Dashboard →
                    </button>
                  </div>
                </Card>
              ),
            },
            {
              label: "Users",
              icon: <Users size={16} />,
              content: (
                <Card variant="default">
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p className="mb-4">Manage user accounts and access levels</p>
                    <button
                      onClick={() => navigate("/admin/users")}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Open User Management →
                    </button>
                  </div>
                </Card>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}