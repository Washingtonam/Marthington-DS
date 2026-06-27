import { useEffect, useState } from "react";
import api from "../../lib/axios"; // Admin dashboard API client

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
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [recentAdminActions, setRecentAdminActions] = useState([]);
  const [search, setSearch] = useState("");
  const [pipelineRequests, setPipelineRequests] = useState([]);

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
    try {
      const response = await api.get("/api/admin/audit-logs", { params: { page: 1, limit: 5 } });
      setRecentAdminActions(response.data?.data || []);
    } catch (error) {
      console.error("🔥 Error fetching admin actions:", error);
      setRecentAdminActions([]);
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

  // ============================
  // FETCH USERS
  // ============================
  const fetchUsers = async () => {
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
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard Workspace</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card title="Total Registered Users" value={stats.totalUsers} />
        <Card title="Pending Payments Verification" value={stats.pendingPayments} />
        <Card title="Systemic Logged Transactions" value={stats.totalTransactions} />
        <Card title="Aggregated Liability Balance" value={`₦${stats.totalBalance || 0}`} />
      </div>

      <div className="grid gap-4 mb-8 xl:grid-cols-3">
        <div className="grid gap-4 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Financial Overview</p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">Daily + Monthly Revenue</h3>
                </div>
              </div>
              {isOverviewLoading ? (
                <div className="space-y-3">
                  <div className="h-10 rounded-xl bg-slate-200 animate-pulse" />
                  <div className="h-10 rounded-xl bg-slate-200 animate-pulse" />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Today</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">₦{Number(overview.dailyRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500">This Month</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">₦{Number(overview.monthlyRevenue || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Service Demand</p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">Request Volume</h3>
                </div>
              </div>
              <div className="min-h-[184px]">
                {isOverviewLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
                    <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
                    <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
                  </div>
                ) : (
                  <BarChart data={overview.pendingRequests} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Recent Admin Activity</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">Last 5 Actions</h3>
            </div>
          </div>
          {recentAdminActions.length === 0 ? (
            <div className="space-y-3">
              <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-3">
              {recentAdminActions.map((action) => (
                <div key={action._id} className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 truncate">{action.action || "Admin action"}</p>
                    <span className="text-xs text-slate-500">{new Date(action.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate mt-2">{action.note || action.description || "No description available."}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Search user registry via Email, First name or Last name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-3 rounded w-full bg-white shadow-sm"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 transition-all text-white px-6 rounded font-medium shadow-sm"
        >
          Search
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600 font-semibold border-b">
            <tr>
              <th className="p-4">Name String</th>
              <th className="p-4">Secure Email Identification</th>
              <th className="p-4">Account Balance Metrics</th>
              <th className="p-4">Network Node Status</th>
              <th className="p-4 text-center">System Actions Matrix</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-400">No active user records index detected.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{user.firstName} {user.lastName}</td>
                  <td className="p-4 text-gray-600">{user.email}</td>
                  <td className="p-4 font-mono text-gray-700">₦{user.balance}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-white text-xs font-semibold uppercase tracking-wider ${
                        user.status === "active" ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2 justify-center">
                    {user.status === "active" ? (
                      <button
                        onClick={() => suspendUser(user._id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Suspend Node
                      </button>
                    ) : (
                      <button
                        onClick={() => activateUser(user._id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Activate Node
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(user._id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Delete Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-gray-800">Pending Identity & Registry Application Tracks</h2>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600 font-semibold border-b">
            <tr>
              <th className="p-4">Applicant Trace</th>
              <th className="p-4">Target Channel</th>
              <th className="p-4">Unique File Details</th>
              <th className="p-4">Status State</th>
            </tr>
          </thead>
          <tbody>
            {pipelineRequests.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-400">No processing operation profiles in current track pipeline.</td>
              </tr>
            ) : (
              pipelineRequests.map((req) => (
                <tr key={req._id} className="border-t hover:bg-gray-50">
                  <td className="p-4 text-gray-700 font-medium">{req.userId?.email || "System-Fallback Native Entry"}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded font-mono text-xs uppercase bg-purple-100 text-purple-800">
                      {req.pipelineSource || req.service || "General"}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 max-w-xs truncate">
                    {req.businessName1 || req.type || "Identity Verification Document Field Context"}
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 uppercase">
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-5 rounded shadow-sm border border-gray-100">
      <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-1">{title}</p>
      <h2 className="text-2xl font-bold text-gray-800">{value ?? 0}</h2>
    </div>
  );
}