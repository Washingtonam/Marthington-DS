import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import {
  Trash2,
  Shield,
  ShieldOff,
  Plus,
  Minus,
  Search,
  AlertCircle,
  CheckCircle,
  Activity,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { useNavigate } from "react-router-dom";

export default function AdminUsers() {
  const { user: currentUser } = useUser();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // State management
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalBalance: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearch, setCurrentSearch] = useState("");
  const [activityRecords, setActivityRecords] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityUser, setActivityUser] = useState(null);
  const [sortBy, setSortBy] = useState("newest"); // 'balance' | 'alphabetical' | 'newest'
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundAction, setFundAction] = useState("add");
  const [fundNote, setFundNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch users with pagination and search
  const fetchUsers = async (pageNum = 1, search = "") => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: pageSize,
        sortBy,
        order: "desc",
      };
      if (search.trim()) {
        params.search = search.trim();
      }
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      if (approvalFilter) params.approvalStatus = approvalFilter;

      const response = await api.get("/api/admin/users", { params });
      setUsers(response.data.data || []);
      setTotalUserCount(response.data.pagination.total);
      setTotalPages(response.data.pagination.pages);
      setPage(pageNum);
    } catch (error) {
      console.error("❌ Fetch users error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to fetch users",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch admin stats
  const fetchStats = async () => {
    try {
      const response = await api.get("/api/admin/stats");
      setStats({
        totalUsers: response.data.totalUsers || 0,
        activeUsers: response.data.activeUsers || 0,
        totalBalance: response.data.totalBalance || 0,
      });
    } catch (error) {
      console.error("❌ Fetch stats error:", error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers(1, "");
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchTerm.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentSearch(searchQuery);
    setPage(1);
    fetchUsers(1, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    // refetch when filters change
    setPage(1);
    fetchUsers(1, currentSearch);
  }, [roleFilter, statusFilter, approvalFilter, sortBy]);

  useEffect(() => {
    if (page !== 1) {
      fetchUsers(page, currentSearch);
    }
  }, [page, currentSearch]);

  const handleSearch = () => {
    setSearchQuery(searchTerm.trim());
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const selectAllVisible = () => {
    const ids = sortedAndFilteredUsers.map((u) => u._id);
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exportSelectedCsv = () => {
    const rows = (sortedAndFilteredUsers.filter((u) => selectedIds.size === 0 || selectedIds.has(u._id))).map((u) => ({
      email: u.email,
      firstName: u.firstName || u.firstname || "",
      lastName: u.lastName || u.lastname || "",
      role: u.role || "user",
      status: u.status || "active",
      balance: ((u.walletBalanceKobo || 0) / 100).toFixed(2),
      registeredAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
      lastLogin: u.lastLoginAt || u.lastLogin || u.lastSeen || "",
    }));

    if (rows.length === 0) {
      setMessage({ type: "error", text: "No users selected or visible to export." });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    const header = Object.keys(rows[0]).join(",");
    const csv = [header]
      .concat(rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const performBulkAction = async (action) => {
    if (selectedIds.size === 0) {
      setMessage({ type: "error", text: "No users selected." });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    if (action === "delete" && !window.confirm("Delete selected users? This action cannot be undone.")) return;

    const ids = Array.from(selectedIds);
    setLoading(true);
    try {
      // For large selections use background job
      if (ids.length > 50) {
        const resp = await api.post("/api/admin/users/bulk-job", { ids, action });
        const jobId = resp.data?.jobId;
        setMessage({ type: "info", text: `Background job started (ID: ${jobId}). Monitoring progress...` });

        // poll job status
        let intervalId;
        const poll = async () => {
          try {
            const r = await api.get(`/api/admin/users/bulk-job/${jobId}`);
            const job = r.data?.data;
            if (job) {
              setMessage({ type: job.status === 'failed' ? 'error' : 'info', text: `Job ${job.status}: ${job.processed || 0}/${job.total || 0}` });
              if (job.status === 'completed' || job.status === 'failed') {
                clearInterval(intervalId);
                clearSelection();
                await fetchUsers(page, currentSearch);
                await fetchStats();
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
              }
            }
          } catch (pe) {
            console.error('Job poll error', pe);
          }
        };

        intervalId = setInterval(poll, 2000);
        // initial immediate poll
        await poll();
      } else {
        const response = await api.post("/api/admin/users/bulk", { ids, action });
        setMessage({ type: "success", text: response.data?.message || `Bulk ${action} completed.` });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        clearSelection();
        await fetchUsers(page, currentSearch);
        await fetchStats();
      }
    } catch (err) {
      console.error("Bulk action error:", err);
      const errMsg = err.response?.data?.message || "Bulk action failed.";
      setMessage({ type: "error", text: errMsg });
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    } finally {
      setLoading(false);
    }
  };

  const sortedAndFilteredUsers = users;

  // Handle fund adjustment
  const handleAdjustFunds = async () => {
    if (!selectedUser || !fundAmount || parseFloat(fundAmount) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/api/admin/adjust-funds", {
        userId: selectedUser._id,
        amount: parseFloat(fundAmount),
        action: fundAction,
        note: fundNote || "Manual adjustment",
      });

      if (response.status === 200 || response.data?.success) {
        if (success) success("User account funded successfully!");

        const newBalanceNaira = response.data?.data?.balanceAfter ?? null;
        const newBalanceKobo =
          newBalanceNaira !== null && newBalanceNaira !== undefined
            ? Math.round(Number(newBalanceNaira) * 100)
            : null;

        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u._id === selectedUser._id
              ? {
                  ...u,
                  walletBalanceKobo:
                    newBalanceKobo !== null
                      ? newBalanceKobo
                      : (u.walletBalanceKobo || 0) + (fundAction === "add" ? Math.round(Number(fundAmount) * 100) : -Math.round(Number(fundAmount) * 100)),
                }
              : u
          )
        );

        setShowFundModal(false);
        setFundAmount("");
        setFundNote("");

        // show a success message in the top alert and auto-clear it
        setMessage({ type: "success", text: "User account funded successfully!" });
        setTimeout(() => setMessage({ type: "", text: "" }), 4000);

        await fetchStats();
      } else {
        setMessage({ type: "error", text: response.data?.message || "Failed to adjust funds" });
      }
    } catch (err) {
      console.error("❌ Fund adjustment error:", err);
      const errMsg = err.response?.data?.message || "Failed to adjust funds";
      if (toastError) toastError(errMsg);
      setMessage({ type: "error", text: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle suspend user
  const handleSuspend = async (userId) => {
    if (!window.confirm("Are you sure you want to suspend this user?")) return;

    try {
      await api.put(`/api/admin/user/${userId}/suspend`);
      setMessage({ type: "success", text: "User suspended successfully" });
      await fetchUsers(page, currentSearch);
    } catch (error) {
      console.error("❌ Suspend error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to suspend user",
      });
    }
  };

  // Handle activate user
  const handleActivate = async (userId) => {
    try {
      await api.put(`/api/admin/user/${userId}/activate`);
      setMessage({ type: "success", text: "User activated successfully" });
      await fetchUsers(page, currentSearch);
    } catch (error) {
      console.error("❌ Activate error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to activate user",
      });
    }
  };

  const handleApproval = async (userId, decision) => {
    if (decision === "reject" && !window.confirm("Reject this agent application?")) return;

    try {
      const response = await api.put(`/api/admin/user/${userId}/${decision}`);
      setMessage({ type: "success", text: response.data?.message || `Application ${decision}ed successfully` });
      await fetchUsers(page, currentSearch);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || `Failed to ${decision} application`,
      });
    }
  };

  // Handle promote to admin
  const handlePromote = async (userId) => {
    if (!isSuperAdmin) {
      setMessage({ type: "error", text: "Only super admins can promote users" });
      return;
    }

    try {
      await api.put(`/api/admin/user/${userId}/make-admin`);
      setMessage({ type: "success", text: "User promoted to admin" });
      await fetchUsers(page, currentSearch);
    } catch (error) {
      console.error("❌ Promote error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to promote user",
      });
    }
  };

  // Handle demote from admin
  const handleDemote = async (userId) => {
    if (!isSuperAdmin) {
      setMessage({ type: "error", text: "Only super admins can demote users" });
      return;
    }

    try {
      await api.put(`/api/admin/user/${userId}/remove-admin`);
      setMessage({ type: "success", text: "User demoted to regular user" });
      await fetchUsers(page, currentSearch);
    } catch (error) {
      console.error("❌ Demote error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to demote user",
      });
    }
  };

  // Handle delete user
  const handleDelete = async (userId) => {
    if (!isSuperAdmin) {
      setMessage({ type: "error", text: "Only super admins can delete users" });
      return;
    }

    if (
      !window.confirm(
        "Are you sure? This action cannot be undone. All user data will be deleted."
      )
    )
      return;

    try {
      await api.delete(`/api/admin/user/${userId}`);
      setMessage({ type: "success", text: "User deleted successfully" });
      await fetchUsers(page, currentSearch);
      await fetchStats();
    } catch (error) {
      console.error("❌ Delete error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to delete user",
      });
    }
  };

  const openActivityModal = async (user) => {
    setActivityLoading(true);
    setActivityUser(user);
    setActivityModalOpen(true);

    try {
      const response = await api.get(`/api/admin/users/${user._id}/activity`);
      setActivityRecords(response.data.data || []);
    } catch (error) {
      console.error("❌ Fetch user activity error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to fetch user activity",
      });
      setActivityRecords([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const closeActivityModal = () => {
    setActivityModalOpen(false);
    setActivityRecords([]);
    setActivityUser(null);
  };

  const openFundModal = (user) => {
    setSelectedUser(user);
    setShowFundModal(true);
    setFundAmount("");
    setFundAction("add");
    setFundNote("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-900 dark:text-slate-100">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Administration</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">User Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Review account activity, manage access, and keep user wallet balances up to date.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { fetchUsers(page, currentSearch); fetchStats(); }}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto"
        >
          <Activity size={16} aria-hidden="true" /> Refresh directory
        </button>
      </header>

      {/* Message Alert */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-900/30 border border-green-600 text-green-200"
              : "bg-red-900/30 border border-red-600 text-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {message.text}
        </div>
      )}

      {/* Stats Header */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total users</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stats.totalUsers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active users</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.activeUsers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total platform wallet balance</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--accent-text)]">
            ₦{stats.totalBalance.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Combined balance across all accounts; individual wallet balances are listed below.
          </p>
        </div>
      </div>

      <section aria-label="Search and filter users" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Directory</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search, filter, and manage platform accounts.</p>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{totalUserCount.toLocaleString()} accounts</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <input
            type="text"
            aria-label="Search users by email or name"
            placeholder="Search name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-rgb),0.18)] dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:col-span-2 xl:col-span-2"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search size={18} />
            Search
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort users"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[var(--accent)] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="newest">Newest Registration</option>
            <option value="balance">Highest Balance</option>
            <option value="alphabetical">Name</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter users by role"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[var(--accent)] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter users by status"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[var(--accent)] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            aria-label="Filter users by approval"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[var(--accent)] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">All approvals</option>
            <option value="pending">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${viewMode === "grid" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
            >
              List
            </button>
          </div>
        </div>
      </section>

      {/* Users Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-400">Loading users...</div>
        </div>
      ) : sortedAndFilteredUsers.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-400">No users found</div>
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2 xl:grid-cols-3">
              {sortedAndFilteredUsers.map((u) => (
                <div
                  key={u._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* User Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(var(--accent-rgb),0.12)] font-semibold text-[var(--accent-text)]">{(u.firstName || u.firstname || u.email || "").charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
                        <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{u.email}</p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u._id)}
                        onChange={() => toggleSelect(u._id)}
                        className="w-4 h-4 mt-1"
                      />
                    </div>
                  </div>

                  {/* Role and Status Badges */}
                  <div className="flex gap-2 mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.role === "super_admin"
                          ? "bg-red-600/30 text-red-200"
                          : u.role === "admin"
                          ? "bg-purple-600/30 text-purple-200"
                          : "bg-blue-600/30 text-blue-200"
                      }`}
                    >
                      {u.role || "user"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.status === "active"
                          ? "bg-green-600/30 text-green-200"
                          : "bg-orange-600/30 text-orange-200"
                      }`}
                    >
                      {u.status || "active"}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      (u.approvalStatus || "approved") === "pending"
                        ? "bg-amber-600/30 text-amber-200"
                        : (u.approvalStatus || "approved") === "rejected"
                        ? "bg-red-600/30 text-red-200"
                        : "bg-emerald-600/30 text-emerald-200"
                    }`}>
                      {u.approvalStatus || "approved"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div>Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</div>
                    <div>Last login: { (u.lastLoginAt || u.lastLogin || u.lastSeen) ? new Date(u.lastLoginAt || u.lastLogin || u.lastSeen).toLocaleString() : '—' }</div>
                  </div>

                  {/* Balance */}
                  <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Wallet balance</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ₦{(u.walletBalanceKobo / 100 || 0).toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {isSuperAdmin && (u.approvalStatus || "approved") === "pending" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleApproval(u._id, "approve")} className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg text-sm font-medium transition">Approve</button>
                        <button onClick={() => handleApproval(u._id, "reject")} className="px-3 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded-lg text-sm font-medium transition">Reject</button>
                      </div>
                    )}
                    <button onClick={() => navigate(`/admin/user/${u._id}/details`)} className="w-full px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 text-white rounded-lg text-sm font-medium transition">View Details</button>
                    {/* Fund Adjustment */}
                    <button
                      onClick={() => openFundModal(u)}
                      className="w-full px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add/Remove Funds
                    </button>

                    {/* Suspend/Activate */}
                    {u.status === "active" ? (
                      <button
                        onClick={() => handleSuspend(u._id)}
                        className="w-full px-3 py-2 bg-orange-600/30 hover:bg-orange-600/50 text-orange-200 rounded-lg text-sm font-medium transition"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(u._id)}
                        className="w-full px-3 py-2 bg-green-600/30 hover:bg-green-600/50 text-green-200 rounded-lg text-sm font-medium transition"
                      >
                        Activate
                      </button>
                    )}

                    {/* Role Management (Super Admin Only) */}
                    {isSuperAdmin && u.role !== "super_admin" && (
                      <>
                        {u.role !== "admin" ? (
                          <button
                            onClick={() => handlePromote(u._id)}
                            className="w-full px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                          >
                            <Shield size={16} />
                            Make Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDemote(u._id)}
                            className="w-full px-3 py-2 bg-slate-600/30 hover:bg-slate-600/50 text-slate-200 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                          >
                            <ShieldOff size={16} />
                            Remove Admin
                          </button>
                        )}
                      </>
                    )}

                    {/* Delete User (Super Admin Only) */}
                    {isSuperAdmin && u.role !== "super_admin" && (
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="w-full px-3 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={sortedAndFilteredUsers.length > 0 && selectedIds.size === sortedAndFilteredUsers.length}
                        onChange={(e) => (e.target.checked ? selectAllVisible() : clearSelection())}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Approval</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedAndFilteredUsers.map((u) => (
                    <tr key={u._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={selectedIds.has(u._id)} onChange={() => toggleSelect(u._id)} className="w-4 h-4" />
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{u.email}</td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(var(--accent-rgb),0.12)] font-medium text-[var(--accent-text)]">{(u.firstName || u.firstname || u.email || "").charAt(0).toUpperCase()}</div>
                          <div>{`${u.firstName || u.firstname || ""} ${u.lastName || ""}`}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{u.role || "user"}</td>
                      <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{u.status || "active"}</td>
                      <td className="px-4 py-3 align-top capitalize text-slate-700 dark:text-slate-200">{u.approvalStatus || "approved"}</td>
                      <td className="px-4 py-3 align-top text-right font-semibold text-emerald-600 dark:text-emerald-400">₦{(u.walletBalanceKobo / 100 || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex gap-2">
                          {isSuperAdmin && (u.approvalStatus || "approved") === "pending" && <>
                            <button onClick={() => handleApproval(u._id, "approve")} className="px-3 py-1 bg-emerald-600/30 rounded-md text-sm text-emerald-200">Approve</button>
                            <button onClick={() => handleApproval(u._id, "reject")} className="px-3 py-1 bg-red-600/30 rounded-md text-sm text-red-200">Reject</button>
                          </>}
                          <button onClick={() => navigate(`/admin/user/${u._id}/details`)} className="px-3 py-1 bg-slate-700/30 rounded-md text-sm text-white">Details</button>
                          <button onClick={() => openFundModal(u)} className="px-3 py-1 bg-emerald-600/30 rounded-md text-sm text-emerald-200">Fund</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activityModalOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/50">
              <div className="w-full max-w-4xl bg-slate-950 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold text-white">{activityUser?.email || "User"} Activity</h2>
                    <p className="text-sm text-slate-400">Latest wallet funding and service activity.</p>
                  </div>
                  <button
                    onClick={closeActivityModal}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                  >
                    Close
                  </button>
                </div>

                <div className="p-5">
                  {activityLoading ? (
                    <div className="text-slate-400">Loading activity...</div>
                  ) : activityRecords.length === 0 ? (
                    <div className="text-slate-400">No activity records found for this user.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm divide-y divide-slate-700">
                        <thead className="bg-slate-900 text-slate-300">
                          <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Amount (₦)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {activityRecords.map((record) => (
                            <tr key={record.id} className="bg-slate-950 hover:bg-slate-900 transition">
                              <td className="px-4 py-3 text-slate-300">
                                {new Date(record.timestamp).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-slate-200 capitalize">
                                {record.category}
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {record.description}
                              </td>
                              <td className={`px-4 py-3 text-right font-semibold ${record.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {record.amount >= 0 ? "+" : "-"}₦{Math.abs(record.amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:flex-row xl:items-center xl:justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">Showing {users.length} of {totalUserCount} users · Page {page} of {totalPages}</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => selectAllVisible()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Select All</button>
                <button onClick={() => clearSelection()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Clear</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => performBulkAction('suspend')} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-200">Suspend Selected</button>
                <button onClick={() => performBulkAction('activate')} className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200">Activate Selected</button>
                <button onClick={() => performBulkAction('delete')} className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-200">Delete Selected</button>
                <button onClick={exportSelectedCsv} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-foreground)] hover:opacity-90">Export CSV</button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchUsers(page - 1, currentSearch)}
                  disabled={page <= 1 || loading}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchUsers(page + 1, currentSearch)}
                  disabled={page >= totalPages || loading}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fund Adjustment Modal */}
      {showFundModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full border border-slate-700">
            <h3 className="text-2xl font-bold text-white mb-6">
              Adjust {selectedUser.email}'s Wallet
            </h3>

            <div className="space-y-4 mb-6">
              {/* Current Balance */}
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Current Balance</p>
                <p className="text-xl font-bold text-blue-400">
                  ₦{(selectedUser.walletBalanceKobo / 100 || 0).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              {/* Action Toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Action
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFundAction("add")}
                    className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      fundAction === "add"
                        ? "bg-green-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    <Plus size={18} />
                    Add
                  </button>
                  <button
                    onClick={() => setFundAction("deduct")}
                    className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      fundAction === "deduct"
                        ? "bg-red-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    <Minus size={18} />
                    Remove
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="Enter amount in Naira"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Note Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={fundNote}
                  onChange={(e) => setFundNote(e.target.value)}
                  placeholder="e.g., Promotional credit, Refund"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFundModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustFunds}
                disabled={submitting}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-white ${
                  fundAction === "add"
                    ? "bg-green-600 hover:bg-green-700 disabled:bg-slate-700"
                    : "bg-red-600 hover:bg-red-700 disabled:bg-slate-700"
                }`}
              >
                {submitting ? "Processing..." : fundAction === "add" ? "Add Funds" : "Remove Funds"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}