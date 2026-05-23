import { useEffect, useState } from "react";

import api from "../../lib/axios"; // Adjust this path if your api.js file is located elsewhere (e.g., "../../api")
 
import {
  Search,
  Users,
  Shield,
  ShieldCheck,
  Coins,
  Trash2,
  UserX,
  UserCheck,
  Eye,
  Activity,
  X,
} from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback string directly prevents empty string/null header drops
  const currentUserEmail = localStorage.getItem("email") || "washingtonamedu@gmail.com";

  const headers = {
    email: currentUserEmail,
  };

  // =========================
  //  api USERS
  // =========================
  const  apiUsers = async () => {
    setLoading(true);
    try {
      // ✅ Now routing safely through your middleware instance
      const res = await api.get("/api/admin/users", { headers });
      const data = res.data?.data || res.data || [];
      setUsers(data);
    } catch (err) {
      console.error("🔥  api USERS ERROR:", err.response?.data || err.message);
    }
    setLoading(false);
  };

  // =========================
  // SEARCH
  // =========================
  const handleSearch = async () => {
    if (!search) return  apiUsers();

    try {
      const res = await api.get(`/api/admin/users?search=${search}`, { headers });
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error("🔥 SEARCH ERROR:", err.response?.data || err.message);
    }
  };

  // =========================
  // USER ACTIVITY
  // =========================
  const  apiUserActivity = async (id) => {
    try {
      const res = await api.get(`/api/admin/user/${id}`, { headers });
      setSelectedUser(res.data.user);
      setUserActivity(res.data.transactions);
    } catch (err) {
      console.error("🔥 ACTIVITY  api ERROR:", err.response?.data || err.message);
    }
  };

  // =========================
  // ROLE CONTROL
  // =========================
  const makeAdmin = async (id) => {
    try {
      await api.put(`/api/admin/user/${id}/make-admin`, {}, { headers });
       apiUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const removeAdmin = async (id) => {
    try {
      await api.put(`/api/admin/user/${id}/remove-admin`, {}, { headers });
       apiUsers();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // STATUS
  // =========================
  const suspendUser = async (id) => {
    try {
      await api.put(`/api/admin/user/${id}/suspend`, {}, { headers });
       apiUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const activateUser = async (id) => {
    try {
      await api.put(`/api/admin/user/${id}/activate`, {}, { headers });
       apiUsers();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // DELETE
  // =========================
  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/api/admin/user/${id}`, { headers });
       apiUsers();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // UNITS
  // =========================
  const addUnits = async (id) => {
    const units = prompt("Units to add:");
    if (!units) return;

    try {
      await api.post(`/api/admin/user/${id}/units`, {
        units: Number(units),
        action: "add",
      }, { headers });
       apiUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const deductUnits = async (id) => {
    const units = prompt("Units to deduct:");
    if (!units) return;

    try {
      await api.post(`/api/admin/user/${id}/units`, {
        units: Number(units),
        action: "deduct",
      }, { headers });
       apiUsers();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
     apiUsers();
  }, []);

  const isSuperAdmin = currentUserEmail === "washingtonamedu@gmail.com";

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* HERO */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={20} />
              <span className="uppercase tracking-widest text-sm opacity-80">
                USER MANAGEMENT
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3">
              Control Platform Users
            </h1>
            <p className="text-blue-100 max-w-2xl">
              Manage access, roles, units, account status, and user activity from one centralized dashboard.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10 min-w-[250px]">
            <p className="text-sm text-blue-100 mb-2">Total Registered Users</p>
            <h2 className="text-5xl font-bold">{users.length}</h2>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-5 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border dark:border-gray-700 bg-transparent pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-semibold transition"
          >
            Search
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      )}

      {/* GRID */}
      {!loading && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {users.map((u) => (
            <div
              key={u._id}
              className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
            >
              {/* TOP */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-white/20 p-2 rounded-xl">
                        <Users size={18} />
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        u.role === "super_admin"
                          ? "bg-black text-white"
                          : u.role === "admin"
                          ? "bg-white text-blue-700"
                          : "bg-white/20"
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <h2
                      onClick={() =>  apiUserActivity(u._id)}
                      className="font-semibold text-sm break-all cursor-pointer hover:underline"
                    >
                      {u.email}
                    </h2>
                  </div>
                  <button
                    onClick={() =>  apiUserActivity(u._id)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>

              {/* BODY */}
              <div className="p-5">
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Units</span>
                    <span className="font-bold dark:text-white">{u.units || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {u.status}
                    </span>
                  </div>
                </div>

                {/* ACTIONS */}
                {u.role !== "super_admin" && (
                  <div className="grid grid-cols-2 gap-3">
                    {u.status === "active" ? (
                      <button
                        onClick={() => suspendUser(u._id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2"
                      >
                        <UserX size={16} /> Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => activateUser(u._id)}
                        className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2"
                      >
                        <UserCheck size={16} /> Activate
                      </button>
                    )}

                    <button
                      onClick={() => addUnits(u._id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <Coins size={16} /> Add
                    </button>

                    <button
                      onClick={() => deductUnits(u._id)}
                      className="bg-gray-900 hover:bg-black text-white py-3 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <Coins size={16} /> Deduct
                    </button>

                    {isSuperAdmin && (
                      <>
                        {u.role === "user" ? (
                          <button
                            onClick={() => makeAdmin(u._id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2"
                          >
                            <Shield size={16} /> Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => removeAdmin(u._id)}
                            className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2"
                          >
                            <Shield size={16} /> Remove
                          </button>
                        )}
                      </>
                    )}

                    {isSuperAdmin && (
                      <button
                        onClick={() => deleteUser(u._id)}
                        className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2 col-span-2"
                      >
                        <Trash2 size={16} /> Delete User
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold break-all">{selectedUser.email}</h2>
                <p className="text-blue-100 text-sm mt-1">User activity & transactions</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-100 dark:bg-[#202020] p-5 rounded-2xl">
                  <p className="text-sm text-gray-500 mb-2">Role</p>
                  <h3 className="font-bold dark:text-white">{selectedUser.role}</h3>
                </div>
                <div className="bg-gray-100 dark:bg-[#202020] p-5 rounded-2xl">
                  <p className="text-sm text-gray-500 mb-2">Units</p>
                  <h3 className="font-bold dark:text-white">{selectedUser.units || 0}</h3>
                </div>
                <div className="bg-gray-100 dark:bg-[#202020] p-5 rounded-2xl">
                  <p className="text-sm text-gray-500 mb-2">Status</p>
                  <h3 className="font-bold dark:text-white">{selectedUser.status}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-5">
                <Activity size={18} className="text-blue-600" />
                <h3 className="font-bold text-lg dark:text-white">Recent Activity</h3>
              </div>

              <div className="space-y-4">
                {userActivity.length === 0 && (
                  <div className="bg-gray-100 dark:bg-[#202020] rounded-2xl p-6 text-center text-gray-500">
                    No activity found
                  </div>
                )}

                {userActivity.map((tx) => (
                  <div key={tx._id} className="bg-gray-100 dark:bg-[#202020] rounded-2xl p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold dark:text-white">{tx.type}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        tx.status === "success" || tx.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : tx.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                      <p>Units: <b>{tx.units || 0}</b></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}