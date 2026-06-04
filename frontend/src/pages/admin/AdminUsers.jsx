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
} from "lucide-react";

export default function AdminUsers() {
  const { user: currentUser } = useUser();
  const isSuperAdmin = currentUser?.role === "super_admin";

  // State management
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalBalance: 0,
  });
  const [searchEmail, setSearchEmail] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUserCount, setTotalUserCount] = useState(0);

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundAction, setFundAction] = useState("add");
  const [fundNote, setFundNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch users with pagination and search
  const fetchUsers = async (pageNum = 1, email = "") => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: pageSize,
      };
      if (email.trim()) {
        params.search = email.trim();
      }

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

  // Handle search
  const handleSearch = () => {
    setPage(1);
    fetchUsers(1, searchEmail);
  };

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

      setMessage({ type: "success", text: response.data.message });
      setShowFundModal(false);
      setFundAmount("");
      setFundNote("");

      // Refresh user list and stats
      await fetchUsers(page, searchEmail);
      await fetchStats();
    } catch (error) {
      console.error("❌ Fund adjustment error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to adjust funds",
      });
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
      await fetchUsers(page, searchEmail);
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
      await fetchUsers(page, searchEmail);
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
      await fetchUsers(page, searchEmail);
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
      await fetchUsers(page, searchEmail);
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
      await fetchUsers(page, searchEmail);
      await fetchStats();
    } catch (error) {
      console.error("❌ Delete error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to delete user",
      });
    }
  };

  const openFundModal = (user) => {
    setSelectedUser(user);
    setShowFundModal(true);
    setFundAmount("");
    setFundAction("add");
    setFundNote("");
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
        <p className="text-slate-400">Manage users, adjust balances, and control access</p>
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
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Total Users</p>
          <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Active Users</p>
          <p className="text-3xl font-bold text-green-400">{stats.activeUsers}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
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
            type="email"
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
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
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-400">Loading users...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-400">No users found</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {users.map((u) => (
              <div
                key={u._id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition"
              >
                {/* User Header */}
                <div className="mb-4">
                  <p className="text-sm text-slate-400 mb-1">Email</p>
                  <p className="text-white font-semibold break-words">{u.email}</p>
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

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-sm">
              Showing {users.length} of {totalUserCount} users (Page {page} of {totalPages})
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchUsers(page - 1, searchEmail)}
                disabled={page <= 1 || loading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition"
              >
                Previous
              </button>
              <button
                onClick={() => fetchUsers(page + 1, searchEmail)}
                disabled={page >= totalPages || loading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition"
              >
                Next
              </button>
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