import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios"; // Admin dashboard API client
import { toast } from "sonner";
import { CheckCircle, CreditCard, FileText, Search, Eye, Users, Wallet, ChevronDown, Clock3, ShieldCheck } from 'lucide-react';
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
        <Card title="Total Registered Users" value={stats.totalUsers} icon={<Users size={18} />} tone="blue" />
        <Card title="Pending Payments" value={pendingPaymentsList.length || stats.pendingPayments} icon={<CreditCard size={18} />} tone="amber" />
        <Card title="Pending Approvals" value={pipelineRequests.length} icon={<FileText size={18} />} tone="violet" />
        <Card title="Aggregated Liability" value={`₦${stats.totalBalance || 0}`} icon={<Wallet size={18} />} tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr] mb-8">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-slate-500">Service Pricing</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Live price list snapshot</h3>
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
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm text-slate-700">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Service</th>
                      <th className="px-4 py-3 font-semibold">Current rate</th>
                      <th className="px-4 py-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-200 bg-white">
                      <td className="px-4 py-3 font-medium">NIN unit</td>
                      <td className="px-4 py-3">₦{Number(pricingOverview?.nin?.unitPrice || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500">Agent: ₦{Number(pricingOverview?.nin?.agentPrice || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-4 py-3 font-medium">Validation / slip</td>
                      <td className="px-4 py-3">₦{Number(pricingOverview?.ninServices?.validation?.noRecord || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500">Slip price: ₦{Number(pricingOverview?.ninServices?.slipPrice || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-white">
                      <td className="px-4 py-3 font-medium">Modification</td>
                      <td className="px-4 py-3">₦{Number(pricingOverview?.ninServices?.modification?.dob || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500">Phone/Name/Address: ₦{Number(pricingOverview?.ninServices?.modification?.phone || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-4 py-3 font-medium">CAC start</td>
                      <td className="px-4 py-3">₦{Number(pricingOverview?.cacServices?.soleProprietorship || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500">Partnership: ₦{Number(pricingOverview?.cacServices?.partnership || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">User Registry</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Account overview</h3>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search by email or name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-slate-200 p-3 rounded-2xl w-full md:w-72 bg-white shadow-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 transition-all text-white px-4 rounded-2xl font-medium shadow-sm"
                >
                  Search
                </button>
              </div>
            </div>

            {isSuperAdminLocal ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-gray-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Balance</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
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
                        const isActive = user.status === "active";

                        return (
                          <tr key={user._id} className="border-t border-slate-200 odd:bg-slate-50 hover:bg-slate-100 transition-colors">
                            <td className="p-4 font-medium text-gray-800">{user.firstName} {user.lastName}</td>
                            <td className="p-4 text-gray-600 flex items-center gap-2">
                              <span>{safeEmail}</span>
                              <button onClick={() => toggleEmailVisibility(user._id)} className="text-slate-500 hover:text-slate-800 focus:outline-none">
                                {visibleEmails[user._id] ? '🙈' : '👁️'}
                              </button>
                            </td>
                            <td className="p-4 font-mono text-gray-700">₦{user.balance}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}`}>
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="relative inline-flex justify-center">
                                <button onClick={() => setOpenActionMenu(openActionMenu === user._id ? null : user._id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                                  Actions <ChevronDown size={14} />
                                </button>
                                {openActionMenu === user._id && (
                                  <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                    {isActive ? (
                                      <button onClick={() => { suspendUser(user._id); setOpenActionMenu(null); }} className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">Suspend account</button>
                                    ) : (
                                      <button onClick={() => { activateUser(user._id); setOpenActionMenu(null); }} className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">Activate account</button>
                                    )}
                                    <button onClick={() => { deleteUser(user._id); setOpenActionMenu(null); }} className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete profile</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-slate-600">
                <p className="text-sm">User registry and account management are restricted to superadmins. Your admin dashboard provides payments, requests, and verification tools.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <motion.div layout className="bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 rounded-3xl p-6 shadow-sm text-white">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} />
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">Operational tasks</p>
            </div>
            <h3 className="text-lg font-bold mb-3">Quick NIN Verification</h3>
            <div className="flex flex-col gap-2 mb-3">
              <input value={ninSearch} onChange={(e) => setNinSearch(e.target.value)} placeholder="Enter NIN to verify" className="w-full border border-white/20 bg-white/10 text-white placeholder:text-blue-100 p-3 rounded-2xl" />
              <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className="w-full border border-white/20 bg-white/10 text-white p-3 rounded-2xl text-sm">
                <option value="all" className="text-slate-900">All statuses</option>
                <option value="completed" className="text-slate-900">Completed</option>
                <option value="pending" className="text-slate-900">Pending</option>
                <option value="processing" className="text-slate-900">Processing</option>
                <option value="failed" className="text-slate-900">Failed</option>
              </select>
              <button onClick={handleVerifyNin} className="bg-white text-slate-900 px-4 py-2 rounded-2xl flex items-center justify-center gap-2 font-semibold">{ninLoading ? 'Checking...' : <><Search className="w-4 h-4" />Verify</>}</button>
            </div>
            <div>
              {ninResults.length === 0 ? (
                <p className="text-sm text-blue-100">No results. Enter a NIN and click Verify to check status across requests.</p>
              ) : (
                <div className="space-y-2">
                  {ninResults.map(r => (
                    <motion.div whileHover={{ scale: 1.01 }} key={r.id} className="rounded-2xl border border-white/20 bg-white/10 p-3 cursor-pointer" onClick={() => { navigate(`/admin/verification-requests?nin=${encodeURIComponent(r.nin)}`); toast.success('Opening related verification requests'); }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" />{r.nin}</div>
                          <div className="text-xs text-blue-100 mt-1">{r.pipeline} • {new Date(r.createdAt).toLocaleString()}</div>
                        </div>
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{r.status}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Recent Admin Activity</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Timeline</h3>
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
                <div className="relative pl-6">
                  <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />
                  {recentAdminActions.map((action) => (
                    <div key={action._id} className="relative mb-4 last:mb-0">
                      <span className="absolute -left-[1.02rem] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600" />
                      <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{action.action || "Admin action"}</p>
                          <span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 size={12} />{new Date(action.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">{action.note || action.description || "No description available."}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-sm text-slate-500">Audit log access is restricted to superadmins.</div>
            )}
          </div>

          <motion.div layout className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-3">Pending Payments</h3>
            {pendingPaymentsList.length === 0 ? (
              <p className="text-sm text-slate-500">No pending payments.</p>
            ) : (
              <div className="space-y-2">
                {pendingPaymentsList.map(p => (
                  <motion.div key={p._id} whileHover={{ x: 6 }} className="p-3 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer" onClick={() => { navigate('/admin/payments'); toast('Opening payments ledger'); }}>
                    <div className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-500" />{p.userEmail || (p.userId && p.userId.email) || 'Unknown'}</div>
                    <div className="text-xs text-slate-600">₦{p.amount || 0}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {isSuperAdminLocal ? (
        <div className="bg-white rounded-3xl shadow-sm overflow-x-auto mb-8 border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Account control</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-gray-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
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
                    <tr key={user._id} className="border-t border-slate-200 odd:bg-slate-50 hover:bg-slate-100 transition-colors">
                      <td className="p-4 font-medium text-gray-800">{user.firstName} {user.lastName}</td>
                      <td className="p-4 text-gray-600 flex items-center gap-2">
                        <span>{safeEmail}</span>
                        <button onClick={() => toggleEmailVisibility(user._id)} className="text-slate-500 hover:text-slate-800 focus:outline-none">
                          {visibleEmails[user._id] ? '🙈' : '👁️'}
                        </button>
                      </td>
                      <td className="p-4 font-mono text-gray-700">₦{user.balance}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}`}>
                          {user.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="relative inline-flex justify-center">
                          <button onClick={() => setOpenActionMenu(openActionMenu === user._id ? null : user._id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                            Actions <ChevronDown size={14} />
                          </button>
                          {openActionMenu === user._id && (
                            <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                              {user.status === "active" ? (
                                <button onClick={() => { suspendUser(user._id); setOpenActionMenu(null); }} className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">Suspend account</button>
                              ) : (
                                <button onClick={() => { activateUser(user._id); setOpenActionMenu(null); }} className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">Activate account</button>
                              )}
                              <button onClick={() => { deleteUser(user._id); setOpenActionMenu(null); }} className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete profile</button>
                            </div>
                          )}
                        </div>
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

function Card({ title, value, icon, tone = "blue" }) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-start justify-between gap-3">
      <div>
        <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-2">{title}</p>
        <h2 className="text-2xl font-bold text-gray-800">{value ?? 0}</h2>
      </div>
      <div className={`rounded-2xl border p-2.5 ${toneClasses[tone] || toneClasses.blue}`}>{icon}</div>
    </div>
  );
}