import React, { useEffect, useState } from "react";
import api from "../../lib/axios";
import { nimcSubServices, cacSubServices } from "../../config/serviceTypes";
import {
  Search, ArrowUpDown, Eye, CheckCircle2, XCircle, Clock3,
  ChevronLeft, ChevronRight, Fingerprint, Building2, AlertCircle,
  MessageSquare, Shield, Calendar
} from "lucide-react";
import SlideOver from "../../components/ui/SlideOver";
import RequestDetails from "./RequestDetails";
import MultiSelect from "../../components/ui/MultiSelect";
import { useToast } from "../../context/ToastContext";

// 🔒 Data Masking Utility for Sensitive Fields
const maskNIN = (nin) => {
  if (!nin || nin === "N/A") return nin;
  return `${String(nin).slice(0, 4)}*****${String(nin).slice(-2)}`;
};

// 🎨 Status Badge Color Mapping
const statusColors = {
  "pending": "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-600",
  "in-progress": "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-600",
  "processing": "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-600",
  "approved": "bg-green-100 text-green-800 border border-green-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-600",
  "completed": "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-600",
  "rejected": "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-600",
  "failed": "bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-600"
};

// 📊 Status Icons
const getStatusIcon = (status) => {
  switch(status?.toLowerCase()) {
    case "approved":
    case "completed":
      return <CheckCircle2 className="w-4 h-4" />;
    case "rejected":
    case "failed":
      return <XCircle className="w-4 h-4" />;
    case "in-progress":
    case "processing":
      return <Clock3 className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export default function AdminRequests() {
  const { success, error: toastError, info } = useToast();
  const [activeTab, setActiveTab] = useState("nimc");
  const [activeSubService, setActiveSubService] = useState("All");
  const [selectedServices, setSelectedServices] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState("");
  const [modalComment, setModalComment] = useState("");
  const [requesterRole, setRequesterRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [approximate, setApproximate] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('table');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(12);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const serviceColors = {
    "Validation": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    "IP Clearance": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
    "Modification": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
    "Personalization": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
    "Self-Service": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200",
    "sole_proprietorship": "bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200",
    "partnership": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    "limited_1m": "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-200",
    "custom_ngo": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200"
  };

  const fetchRequests = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: pageSize,
        status: activeStatus === "all" ? "" : activeStatus,
        category: activeTab === "cac" ? "cac" : "nimc",
        serviceType: selectedServices.length ? selectedServices.join(',') : '',
        search: searchQuery || searchTerm,
        userRole: requesterRole,
        sortBy,
        order,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        minAmount: minAmount || undefined,
        maxAmount: maxAmount || undefined,
      };

      const res = await api.get("/api/admin/requests", { params });
      const data = res.data?.data || res.data?.requests || [];
      setRequests(data);
      setPages(res.data?.pagination?.pages || 1);
      setApproximate(!!res.data?.pagination?.approximate);
      setPage(pageNum);
    } catch (err) {
      console.error("Fetch Error:", err);
      setRequests([]);
      if (toastError) toastError(err.response?.data?.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
  }, [activeStatus, activeTab, selectedServices, requesterRole]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchTerm.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    // when searchQuery changes, refetch
    setPage(1);
    fetchRequests(1);
  }, [searchQuery]);

  useEffect(() => {
    if (selected) {
      setModalStatus(selected.status || "pending");
      setModalComment("");
    }
  }, [selected]);

  const handleStatusUpdate = async (id, status, note = '') => {
    if (!id) return;
    if (!window.confirm(`Confirm ${status} for this record?`)) return;

    try {
      if (status === 'approved') {
        await api.put(`/api/admin/approve-request/${id}`, { note });
      } else {
        await api.put(`/api/admin/status/${id}`, { status, note });
      }
      if (success) success('Request status updated');
      await fetchRequests(page);
    } catch (err) {
      console.error("Status update failed:", err);
      if (toastError) toastError(err.response?.data?.message || "Failed to update request status.");
    }
  };

  const applyFilters = () => {
    setPage(1);
    fetchRequests(1);
  };

  // Job panel
  const [showJobs, setShowJobs] = useState(false);
  const [jobs, setJobs] = useState([]);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/api/admin/requests/bulk-jobs', { params: { limit: 50, status: 'processing' } });
      setJobs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
  };

  useEffect(() => {
    let iv;
    if (showJobs) {
      fetchJobs();
      iv = setInterval(fetchJobs, 3000);
    }
    return () => clearInterval(iv);
  }, [showJobs]);

  const [jobDetails, setJobDetails] = useState(null);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const selectAllVisible = () => {
    const ids = displayedRequests.map((r) => r._id);
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const performBulkAction = async (action) => {
    if (selectedIds.size === 0) {
      if (toastError) toastError('No requests selected');
      return;
    }

    const ids = Array.from(selectedIds);
    try {
      if (ids.length > 50) {
        const resp = await api.post('/api/admin/requests/bulk-job', { ids, action });
        const jobId = resp.data?.jobId;
        if (info) info(`Background job started (ID: ${jobId}). Monitoring progress...`);

        let intervalId;
        const poll = async () => {
          try {
            const r = await api.get(`/api/admin/requests/bulk-job/${jobId}`);
            const job = r.data?.data;
            if (job) {
              if (job.status === 'completed') {
                clearInterval(intervalId);
                if (success) success(`Job completed: ${job.processed}/${job.total}`);
                clearSelection();
                await fetchRequests(page);
              } else if (job.status === 'failed') {
                clearInterval(intervalId);
                if (toastError) toastError('Job failed');
              } else {
                if (info) info(`Job ${job.status}: ${job.processed}/${job.total}`);
              }
            }
          } catch (e) {
            console.error('Job poll error', e);
          }
        };
        intervalId = setInterval(poll, 2000);
        await poll();
      } else {
        const res = await api.post('/api/admin/requests/bulk', { ids, action });
        if (success) success(res.data?.message || 'Bulk action completed');
        clearSelection();
        await fetchRequests(page);
      }
    } catch (err) {
      console.error('Bulk request action error', err);
      if (toastError) toastError(err.response?.data?.message || 'Bulk action failed');
    }
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveSubService("All");
    setSelectedServices([]);
    setPage(1);
  };

  const handleSubServiceChange = (subService) => {
    setActiveSubService(subService);
    setPage(1);
  };

  const handleServiceMultiChange = (e) => {
    const options = Array.from(e.target.options || []);
    const vals = options.filter(o => o.selected).map(o => o.value);
    if (vals.includes('All')) {
      setSelectedServices([]);
    } else {
      setSelectedServices(vals);
    }
    setPage(1);
  };

  const handleRoleChange = (role) => {
    setRequesterRole(role);
    setPage(1);
  };

  const displayedRequests = requests;

  const formatDateShort = (iso) => iso ? new Date(iso).toLocaleDateString() : '-';
  const formatAmount = (v) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(v || 0);

  const getRequestTitle = (request) => {
    if (request.pipelineSource === "cac") {
      return request.serviceType ? request.serviceType.replace(/_/g, " ") : "CAC";
    }
    return request.service || "General";
  };

  const getRequestDetails = (request) => {
    const hiddenKeys = ["_id", "__v", "userId", "createdAt", "updatedAt", "statusHistory", "adminComments", "formData", "pipelineSource"];
    if (request.pipelineSource === "cac") {
      return Object.entries(request)
        .filter(([key]) => !hiddenKeys.includes(key))
        .map(([key, value]) => ({ key, value }));
    }
    if (request.formData && Object.keys(request.formData).length > 0) {
      return Object.entries(request.formData).map(([key, value]) => ({ key, value }));
    }
    return Object.entries(request)
      .filter(([key]) => !hiddenKeys.includes(key))
      .map(([key, value]) => ({ key, value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Consolidated Action Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {['nimc', 'cac'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2 font-semibold rounded-2xl transition ${activeTab === tab ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                {tab.toUpperCase()}
              </button>
            ))}

            <div className="ml-2 w-72">
              <MultiSelect options={(activeTab === 'nimc' ? nimcSubServices : cacSubServices)} value={selectedServices} onChange={setSelectedServices} placeholder="Service types" />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center rounded-xl p-2 border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
              <Search className="mr-2 text-slate-500 dark:text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                placeholder="Search by email, NIN, service or ID"
                className="w-64 md:w-80 outline-none bg-transparent text-slate-900 dark:text-slate-100"
              />
            </div>
              <button onClick={() => { const qs = new URLSearchParams({ search: searchQuery || searchTerm, status: activeStatus === 'all' ? '' : activeStatus, category: activeTab === 'cac' ? 'cac' : 'nimc', serviceType: selectedServices.length ? selectedServices.join(',') : '', userRole: requesterRole, sortBy, order }); window.open(`/api/admin/requests/export?${qs.toString()}`, '_blank'); }} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-200 dark:text-slate-950">Export</button>
              <button onClick={() => setShowJobs(true)} aria-label="Open Jobs panel" className="rounded-2xl bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Jobs</button>
              <button onClick={() => { if (selectedIds.size === 0) selectAllVisible(); else clearSelection(); }} className="rounded-2xl bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{selectedIds.size === 0 ? 'Select Visible' : `Selected ${selectedIds.size}`}</button>

            <select value={activeStatus} onChange={(e) => handleStatusChange(e.target.value)} className="px-3 py-2 rounded-2xl border border-slate-300 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option value="all">All Statuses</option>
              {["pending", "approved", "in-progress", "processing", "completed", "rejected", "failed"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select value={requesterRole} onChange={(e) => handleRoleChange(e.target.value)} className="px-3 py-2 rounded-2xl border border-slate-300 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option value="all">All Requesters</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>

            <button onClick={applyFilters} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-200 dark:text-slate-950">Apply</button>
            <button onClick={() => { setActiveStatus('all'); setActiveSubService('All'); setSelectedServices([]); setRequesterRole('all'); setSearchTerm(''); setPage(1); fetchRequests(1); }} className="rounded-2xl bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Clear</button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('table')} className={`px-3 py-2 rounded-xl ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Table</button>
          <button onClick={() => setViewMode('cards')} className={`px-3 py-2 rounded-xl ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Cards</button>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); fetchRequests(1); }} className="ml-3 p-2 rounded-xl border">
            {[12,25,50,100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2 rounded-xl border" />
          <label className="text-sm">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 rounded-xl border" />
          <input placeholder="Min amount" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="p-2 rounded-xl border w-28" />
          <input placeholder="Max amount" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="p-2 rounded-xl border w-28" />
          <button onClick={applyFilters} className="px-4 py-2 rounded-2xl bg-slate-900 text-white">Apply</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-300 p-10 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            <span>Loading requests...</span>
          </div>
        </div>
      ) : displayedRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No requests found</p>
          <p className="mt-2">Try a different filter or search term.</p>
        </div>
      ) : (
        viewMode === 'table' ? (
          <div className="overflow-auto bg-white rounded-2xl border">
            {selectedIds.size > 0 && (
              <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                <div>{selectedIds.size} selected</div>
                <div className="flex gap-2">
                  <button onClick={() => performBulkAction('approve')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Bulk Approve</button>
                  <button onClick={() => performBulkAction('reject')} className="px-3 py-2 rounded-xl bg-red-600 text-white">Bulk Reject</button>
                  <button onClick={() => { clearSelection(); }} className="px-3 py-2 rounded-xl bg-gray-200">Clear</button>
                </div>
              </div>
            )}
            <table className="min-w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                <tr>
                  <th className="p-3"><input type="checkbox" onChange={(e) => { if (e.target.checked) selectAllVisible(); else clearSelection(); }} checked={selectedIds.size > 0 && selectedIds.size === displayedRequests.length} /></th>
                  <th className="p-3 cursor-pointer" onClick={() => { setSortBy('createdAt'); setOrder(order === 'asc' ? 'desc' : 'asc'); fetchRequests(1); }}>Created</th>
                  <th className="p-3">Requester</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Pipeline</th>
                  <th className="p-3 cursor-pointer" onClick={() => { setSortBy('serviceType'); setOrder(order === 'asc' ? 'desc' : 'asc'); fetchRequests(1); }}>Service</th>
                  <th className="p-3 cursor-pointer" onClick={() => { setSortBy('amount'); setOrder(order === 'asc' ? 'desc' : 'asc'); fetchRequests(1); }}>Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedRequests.map((r) => (
                  <tr key={r._id} className="border-b">
                    <td className="p-3"><input type="checkbox" checked={selectedIds.has(r._id)} onChange={() => toggleSelect(r._id)} /></td>
                    <td className="p-3">{formatDateShort(r.createdAt)}</td>
                    <td className="p-3">{r.userId?.email || '-'}</td>
                    <td className="p-3">{r.userId?.role || '-'}</td>
                    <td className="p-3">{r.pipelineSource === 'cac' ? 'CAC' : 'NIMC'}</td>
                    <td className="p-3">{r.serviceType || r.service || '-'}</td>
                    <td className="p-3">{formatAmount(r.amount || r.amountCharged)}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded ${statusColors[r.status] || 'bg-slate-100'}`}>{r.status}</span></td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setSelected(r); }} className="px-2 py-1 rounded bg-slate-900 text-white">Inspect</button>
                        <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(r)); if (success) success('Request JSON copied'); }} className="px-2 py-1 rounded bg-slate-100">Copy</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {displayedRequests.map(r => (
              <div key={r._id} className={`bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition ${r.status === 'pending' ? 'ring-1 ring-yellow-300 dark:ring-yellow-600' : ''} h-full flex flex-col`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-sm truncate">{r.userId?.email}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: {r._id.slice(-6)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${statusColors[r.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{r.status?.replace('-', ' ') || 'pending'}</span>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${serviceColors[r.service || r.serviceType] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{r.pipelineSource === "cac" ? (r.serviceType || "CAC") : (r.service || "General")}</span>
                <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between"><span className="text-slate-500">Requested by:</span><span className="font-semibold">{r.userId?.role || 'user'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Category:</span><span className="font-semibold">{r.pipelineSource === "cac" ? "CAC" : "NIMC"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Amount:</span><span className="font-semibold">{formatAmount(r.amount || 0)}</span></div>
                </div>
                <div className="mt-auto flex gap-2 items-end">
                  <div className="flex items-center mr-2"><input type="checkbox" checked={selectedIds.has(r._id)} onChange={() => toggleSelect(r._id)} className="w-4 h-4" /></div>
                  <button onClick={() => setSelected(r)} className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs flex-1">Inspect</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="flex justify-center items-center gap-4 mt-10">
        <button disabled={page === 1} onClick={() => { setPage(1); fetchRequests(1); }} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50">First</button>
        <button disabled={page === 1} onClick={() => fetchRequests(page - 1)} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"><ChevronLeft /></button>
        <span className="font-bold text-slate-900 dark:text-slate-100">Page {page} of {pages} {approximate ? <span className="text-xs text-slate-500 ml-2">(approx)</span> : null}</span>
        <div className="flex items-center gap-2">
          <label className="text-sm">Jump</label>
          <input type="number" min={1} max={pages} value={page} onChange={(e) => { const v = Math.max(1, Math.min(pages, Number(e.target.value || 1))); setPage(v); fetchRequests(v); }} className="w-16 p-2 rounded-xl border" />
        </div>
        <button disabled={page === pages} onClick={() => fetchRequests(page + 1)} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"><ChevronRight /></button>
        <button disabled={page === pages} onClick={() => { setPage(pages); fetchRequests(pages); }} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50">Last</button>
      </div>
      {selected && (
        <SlideOver isOpen={!!selected} onClose={() => setSelected(null)} title="Request Details">
          <RequestDetails
            selected={selected}
            modalStatus={modalStatus}
            setModalStatus={setModalStatus}
            modalComment={modalComment}
            setModalComment={setModalComment}
            handleStatusUpdate={handleStatusUpdate}
            fetchRequests={fetchRequests}
            page={page}
            setSelected={setSelected}
          />
        </SlideOver>
      )}
      {showJobs && (
        <SlideOver isOpen={showJobs} onClose={() => setShowJobs(false)} title="Background Jobs">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Recent Bulk Jobs</h4>
              <div className="flex gap-2">
                <button onClick={fetchJobs} className="px-3 py-2 rounded bg-slate-100">Refresh</button>
                <button onClick={() => setShowJobs(false)} className="px-3 py-2 rounded bg-gray-200">Close</button>
              </div>
            </div>
            {jobs.length === 0 ? (
              <p className="text-sm text-slate-500">No running jobs.</p>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job._id} tabIndex={0} role="button" aria-label={`Bulk job ${job.action} ${job._id}`} onKeyDown={async (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { const r = await api.get(`/api/admin/requests/bulk-job/${job._id}`); const full = JSON.stringify(r.data?.data, null, 2); setJobDetails(full); } catch (err) { if (toastError) toastError('Failed to load job details'); } } }} className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{job.action} — {job._id}</div>
                        <div className="text-xs text-slate-500">Created: {new Date(job.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="font-semibold">{job.status}</div>
                        <div className="text-xs" aria-live="polite">{job.processed || 0}/{job.total || 0}</div>
                      </div>
                    </div>
                    {Array.isArray(job.errors) && job.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        <strong>Errors:</strong>
                        <ul className="list-disc ml-5">
                          {job.errors.slice(0,3).map((e,i) => <li key={i}>{String(e).slice(0,200)}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={async () => { try { const r = await api.get(`/api/admin/requests/bulk-job/${job._id}`); const full = JSON.stringify(r.data?.data, null, 2); setJobDetails(full); } catch (err) { if (toastError) toastError('Failed to load job details'); } }} aria-label={`View details for job ${job._id}`} className="px-2 py-1 rounded bg-slate-100 text-xs">View Details</button>
                      <button type="button" onClick={async () => { try { const r = await api.get(`/api/admin/requests/bulk-job/${job._id}`); const data = r.data?.data || {}; const errors = Array.isArray(data.errors) ? data.errors : []; const csv = errors.map(e => `"${String(e).replace(/"/g,'""')}"`).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `job_${job._id}_errors.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); if (success) success('Errors downloaded'); } catch (err) { if (toastError) toastError('Failed to download errors'); } }} aria-label={`Download errors for job ${job._id}`} className="px-2 py-1 rounded bg-slate-100 text-xs">Download Errors</button>
                      <button type="button" onClick={async () => { try { const r = await api.get(`/api/admin/requests/bulk-job/${job._id}`); const full = JSON.stringify(r.data?.data, null, 2); await navigator.clipboard.writeText(full); if (success) success('Job data copied'); } catch (err) { if (toastError) toastError('Failed to copy job'); } }} aria-label={`Copy JSON for job ${job._id}`} className="px-2 py-1 rounded bg-slate-100 text-xs">Copy JSON</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {jobDetails && (
              <div className="mt-4 p-3 bg-slate-50 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">Job Details</div>
                  <button onClick={() => setJobDetails(null)} className="px-2 py-1 rounded bg-gray-200">Close</button>
                </div>
                <pre className="text-xs max-h-64 overflow-auto p-2 bg-white border rounded">{jobDetails}</pre>
              </div>
            )}
          </div>
        </SlideOver>
      )}
    </div>
  );
}