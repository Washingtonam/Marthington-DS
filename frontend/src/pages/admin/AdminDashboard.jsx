import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios"; // Admin dashboard API client
import { toast } from "sonner";
import { CheckCircle, CreditCard, FileText, Search, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

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
      const res = await api.get("/api/verification-requests", { params: { nin: ninSearch.trim(), limit: 20 } });
      const data = res.data?.data || [];
      const filteredData = verificationFilter === "all" ? data : data.filter((r) => String(r.status || "").toLowerCase() === verificationFilter);
      setNinResults(filteredData.map(r => ({
        id: r._id,
        nin: r.nin || "N/A",
        status: (r.status || "unknown").toUpperCase(),
        pipeline: r.method ? `Verification (${r.method})` : "Verification",
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-800 to-blue-600 text-white p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Admin Control Center</h1>
            <p className="text-sm text-slate-200 mt-1">Overview of requests, payments and quick verification tools</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-200">System Status</p>
            <p className="text-lg font-semibold">All Systems Nominal</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card title="Total Registered Users" value={stats.totalUsers} />
        <Card title="Pending Payments" value={pendingPaymentsList.length || stats.pendingPayments} />
        <Card title="Pending Approvals" value={pipelineRequests.length} />
        <Card title="Aggregated Liability" value={`₦${stats.totalBalance || 0}`} />
      </div>

      <div className="grid gap-4 mb-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Current Pricing Overview</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">Live price list snapshot</h3>
            </div>
            <button onClick={() => navigate('/admin/pricing')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              Manage pricing
            </button>
          </div>
          {isPricingLoading ? (
            <div className="space-y-3">
              <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-4 rounded-full bg-slate-200 animate-pulse" />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs uppercase tracking-widest text-slate-500">NIN Unit Price</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">₦{Number(pricingOverview?.nin?.unitPrice || 0).toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">Agent price: ₦{Number(pricingOverview?.nin?.agentPrice || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs uppercase tracking-widest text-slate-500">Validation / Slip</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">₦{Number(pricingOverview?.ninServices?.validation?.noRecord || 0).toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">Slip: ₦{Number(pricingOverview?.ninServices?.slipPrice || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs uppercase tracking-widest text-slate-500">Modification</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">₦{Number(pricingOverview?.ninServices?.modification?.dob || 0).toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">Phone/Name/Address: ₦{Number(pricingOverview?.ninServices?.modification?.phone || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs uppercase tracking-widest text-slate-500">CAC Start Price</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">₦{Number(pricingOverview?.cacServices?.soleProprietorship || 0).toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">Partnership: ₦{Number(pricingOverview?.cacServices?.partnership || 0).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Recent Admin Activity</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">Last 5 Actions</h3>
              </div>
            </div>
            {isSuperAdminLocal ? (
              recentAdminActions.length === 0 ? (
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
              )
            ) : (
              <div className="text-sm text-slate-500">Audit log access is restricted to superadmins.</div>
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

      <div className="mb-6 grid md:grid-cols-3 gap-4">
          <motion.div layout className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Quick NIN Verification</h3>
          <div className="flex flex-col gap-2 mb-3 md:flex-row">
            <input value={ninSearch} onChange={(e) => setNinSearch(e.target.value)} placeholder="Enter NIN to verify" className="flex-1 border p-3 rounded" />
            <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className="border p-3 rounded bg-white text-sm">
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            <button onClick={handleVerifyNin} className="bg-slate-900 text-white px-4 py-2 rounded flex items-center gap-2">{ninLoading ? 'Checking...' : <><Search className="w-4 h-4" />Verify</>}</button>
          </div>
          <div>
            {ninResults.length === 0 ? (
              <p className="text-sm text-slate-500">No results. Enter a NIN and click Verify to check status across requests.</p>
            ) : (
              <div className="space-y-2">
                {ninResults.map(r => (
                  <motion.div whileHover={{ scale: 1.01 }} key={r.id} className="p-3 rounded-lg border flex items-center justify-between cursor-pointer" onClick={() => { navigate(`/admin/verification-requests?nin=${encodeURIComponent(r.nin)}`); toast.success('Opening related verification requests'); }}>
                    <div>
                      <div className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" />{r.nin}</div>
                      <div className="text-xs text-slate-500">{r.pipeline} • {new Date(r.createdAt).toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{r.request?.method ? `Method: ${r.request.method}` : "Verification request"}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-sm font-semibold">{r.status}</span>
                      <Eye className="w-4 h-4 text-slate-500" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          </motion.div>

        <motion.div layout className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-3">Pending Payments</h3>
          {pendingPaymentsList.length === 0 ? (
            <p className="text-sm text-slate-500">No pending payments.</p>
          ) : (
            <div className="space-y-2">
              {pendingPaymentsList.map(p => (
                <motion.div key={p._id} whileHover={{ x: 6 }} className="p-3 rounded-lg border flex items-center justify-between cursor-pointer" onClick={() => { navigate('/admin/payments'); toast('Opening payments ledger'); }}>
                  <div className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-500" />{p.userEmail || (p.userId && p.userId.email) || 'Unknown'}</div>
                  <div className="text-xs text-slate-600">₦{p.amount || 0}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {isSuperAdminLocal ? (
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
                users.map((user) => {
                  const email = String(user.email || "");
                  const safeEmail = visibleEmails[user._id] ? email : maskEmail(email);

                  return (
                    <tr key={user._id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-800">{user.firstName} {user.lastName}</td>
                      <td className="p-4 text-gray-600 flex items-center gap-2">
                        <span>{safeEmail}</span>
                        <button onClick={() => toggleEmailVisibility(user._id)} className="text-slate-500 hover:text-slate-800 focus:outline-none">
                          {visibleEmails[user._id] ? '🙈' : '👁️'}
                        </button>
                      </td>
                      <td className="p-4 font-mono text-gray-700">₦{user.balance}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-white text-xs font-semibold uppercase tracking-wider ${user.status === "active" ? "bg-green-500" : "bg-red-500"}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="p-4 flex gap-2 justify-center">
                        {user.status === "active" ? (
                          <button onClick={() => suspendUser(user._id)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors">Suspend Node</button>
                        ) : (
                          <button onClick={() => activateUser(user._id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors">Activate Node</button>
                        )}
                        <button onClick={() => deleteUser(user._id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors">Delete Profile</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded shadow p-6 mb-8 text-slate-600">
          <p className="text-sm">User registry and account management are restricted to superadmins. Your admin dashboard provides payments, requests, and verification tools.</p>
        </div>
      )}
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