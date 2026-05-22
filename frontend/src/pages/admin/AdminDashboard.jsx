import { useEffect, useState } from "react";
import api from "../api"; // 👈 Imports your customized Axios configuration instance

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [pipelineRequests, setPipelineRequests] = useState([]); // State for /api/admin/requests data

  // ============================
  // FETCH UNIFIED REQUESTS (Fixes the 401/404 pipeline block)
  // ============================
  const fetchPipelineRequests = async () => {
    try {
      const response = await api.get("/api/admin/requests", {
        params: { page: 1, limit: 20, status: "pending" }
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
      // Fallback array formatting handling data pagination wrappers
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
        params: { search: search } // Matches your backend pagination regex search query
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
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard Workspace</h1>

      {/* STATS MATRIX SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card title="Total Registered Users" value={stats.totalUsers} />
        <Card title="Pending Payments Verification" value={stats.pendingPayments} />
        <Card title="Systemic Logged Transactions" value={stats.totalTransactions} />
        <Card title="Aggregated Liability Balance" value={`₦${stats.totalBalance || 0}`} />
      </div>

      {/* SEARCH SYSTEM INDEX */}
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

      {/* USER DATA SHEET ARCHIVE */}
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

      {/* NEW SECTION: CENTRAL PIPELINE DOCUMENTS LOG TARGET */}
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