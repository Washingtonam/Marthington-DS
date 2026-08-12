import { useState, useEffect, useMemo } from "react";
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
      };
      if (search.trim()) {
        params.search = search.trim();
      }
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

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
  }, [roleFilter, statusFilter]);

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

  const filteredUsers = useMemo(() => {
    return users;
  }, [users]);

  const sortedAndFilteredUsers = useMemo(() => {
    const result = [...filteredUsers];
    if (sortBy === "balance") {
      result.sort((a, b) => (b.walletBalanceKobo || 0) - (a.walletBalanceKobo || 0));
    } else if (sortBy === "alphabetical") {
      result.sort((a, b) => (a.firstname || "").localeCompare(b.firstname || ""));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return result;
  }, [filteredUsers, sortBy]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-slate-950 dark:text-white">User Management</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage users, adjust balances, and control access</p>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-slate-400 text-sm mb-1">Total Users</p>
          <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-slate-400 text-sm mb-1">Active Users</p>
          <p className="text-3xl font-bold text-green-400">{stats.activeUsers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-slate-400 text-sm mb-1">Total Platform Balance</p>
          <p className="text-3xl font-bold text-blue-400">
            ₦{stats.totalBalance.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8 flex gap-3">
        <div className="flex-1 flex gap-3">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg text-white font-medium flex items-center gap-2 transition"
          >
            <Search size={18} />
            Search
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="ml-3 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
          >
            <option value="newest">Newest Registration</option>
            <option value="balance">Highest Balance</option>
            <option value="alphabetical">Name</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="ml-3 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
          >
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ml-3 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <div className="ml-3 flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 rounded-lg text-sm ${viewMode === "grid" ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 rounded-lg text-sm ${viewMode === "list" ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-300"}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {sortedAndFilteredUsers.map((u) => (
                <div
                  key={u._id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition"
                >
                  {/* User Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold">{(u.firstName || u.firstname || u.email || "").charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Email</p>
                        <p className="text-white font-semibold break-words">{u.email}</p>
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
                  </div>

                  <div className="text-xs text-slate-400 mt-3">
                    <div>Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</div>
                    <div>Last login: { (u.lastLoginAt || u.lastLogin || u.lastSeen) ? new Date(u.lastLoginAt || u.lastLogin || u.lastSeen).toLocaleString() : '—' }</div>
                  </div>

                  {/* Balance */}
                  <div className="mb-6 p-3 bg-slate-900/50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Wallet Balance</p>
                    <p className="text-xl font-bold text-green-400">
                      ₦{(u.walletBalanceKobo / 100 || 0).toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
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
            <div className="mb-8 overflow-x-auto bg-slate-900/40 rounded-lg p-4">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
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
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sortedAndFilteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 align-top text-slate-200">
                        <input type="checkbox" checked={selectedIds.has(u._id)} onChange={() => toggleSelect(u._id)} className="w-4 h-4" />
                      </td>
                      <td className="px-4 py-3 align-top text-slate-200">{u.email}</td>
                      <td className="px-4 py-3 align-top text-slate-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">{(u.firstName || u.firstname || u.email || "").charAt(0).toUpperCase()}</div>
                          <div>{`${u.firstName || u.firstname || ""} ${u.lastName || ""}`}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-200">{u.role || "user"}</td>
                      <td className="px-4 py-3 align-top text-slate-200">{u.status || "active"}</td>
                      <td className="px-4 py-3 align-top text-right font-semibold text-green-400">₦{(u.walletBalanceKobo / 100 || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex gap-2">
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
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-sm">Showing {users.length} of {totalUserCount} users (Page {page} of {totalPages})</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => selectAllVisible()} className="px-3 py-1 bg-slate-700 rounded text-sm text-white">Select All</button>
                <button onClick={() => clearSelection()} className="px-3 py-1 bg-slate-700 rounded text-sm text-white">Clear</button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => performBulkAction('suspend')} className="px-3 py-1 bg-orange-600 rounded text-sm text-white">Suspend Selected</button>
                <button onClick={() => performBulkAction('activate')} className="px-3 py-1 bg-green-600 rounded text-sm text-white">Activate Selected</button>
                <button onClick={() => performBulkAction('delete')} className="px-3 py-1 bg-red-600 rounded text-sm text-white">Delete Selected</button>
                <button onClick={exportSelectedCsv} className="px-3 py-1 bg-blue-600 rounded text-sm text-white">Export CSV</button>
              </div>
              <div>
                <button
                  onClick={() => fetchUsers(page - 1, currentSearch)}
                  disabled={page <= 1 || loading}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchUsers(page + 1, currentSearch)}
                  disabled={page >= totalPages || loading}
                  className="ml-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition"
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