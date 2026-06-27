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
  const [activeTab, setActiveTab] = useState("nimc");
  const [activeSubService, setActiveSubService] = useState("All");
  const [activeStatus, setActiveStatus] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState("");
  const [modalComment, setModalComment] = useState("");
  const [requesterRole, setRequesterRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

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
        limit: 12,
        status: activeStatus === "all" ? "" : activeStatus,
        category: activeTab === "cac" ? "cac" : "nimc",
        serviceType: activeSubService === "All" ? "" : activeSubService,
        search: searchTerm,
        userRole: requesterRole,
      };

      const res = await api.get("/api/admin/requests", { params });
      const data = res.data?.data || res.data?.requests || [];
      setRequests(data);
      setPages(res.data?.pagination?.pages || 1);
      setPage(pageNum);
    } catch (err) {
      console.error("Fetch Error:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
  }, [activeStatus, activeTab, activeSubService, requesterRole]);

  useEffect(() => {
    if (selected) {
      setModalStatus(selected.status || "pending");
      setModalComment("");
    }
  }, [selected]);

  const handleStatusUpdate = async (id, status) => {
    if (!id) return;
    if (!window.confirm(`Confirm ${status} for this record?`)) return;

    try {
      if (status === 'approved') {
        await api.put(`/api/admin/approve-request/${id}`, {});
      } else {
        await api.put(`/api/admin/status/${id}`, { status });
      }
      fetchRequests(page);
    } catch (err) {
      console.error("Status update failed:", err);
      alert(err.response?.data?.message || "Failed to update request status.");
    }
  };

  const applyFilters = () => {
    setPage(1);
    fetchRequests(1);
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveSubService("All");
    setPage(1);
  };

  const handleSubServiceChange = (subService) => {
    setActiveSubService(subService);
    setPage(1);
  };

  const handleRoleChange = (role) => {
    setRequesterRole(role);
    setPage(1);
  };

  const displayedRequests = requests;

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

            <div className="ml-2">
              <select value={activeSubService} onChange={(e) => handleSubServiceChange(e.target.value)} className="px-3 py-2 rounded-2xl border border-slate-300 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <option value="All">All</option>
                {(activeTab === 'nimc' ? nimcSubServices : cacSubServices).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
            <button onClick={() => { setActiveStatus('all'); setActiveSubService('All'); setRequesterRole('all'); setSearchTerm(''); setPage(1); fetchRequests(1); }} className="rounded-2xl bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Clear</button>
          </div>
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
        <div className="grid md:grid-cols-3 gap-6">
          {displayedRequests.map(r => (
          <div
            key={r._id}
            className={`bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition ${r.status === 'pending' ? 'ring-1 ring-yellow-300 dark:ring-yellow-600' : ''} h-full flex flex-col`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-sm truncate">{r.userId?.email}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: {r._id.slice(-6)}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${statusColors[r.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                {r.status?.replace('-', ' ') || 'pending'}
              </span>
            </div>
            
            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${serviceColors[r.service || r.serviceType] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
              {r.pipelineSource === "cac" ? (r.serviceType || "CAC") : (r.service || "General")}
            </span>
            
            <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-500">Requested by:</span>
                <span className="font-semibold">{r.userId?.role || 'user'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold">{r.pipelineSource === "cac" ? "CAC" : "NIMC"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-semibold">₦{r.amount || 0}</span>
              </div>
            </div>
            
              <div className="mt-auto flex gap-2 items-end">
              <button 
                onClick={() => {
                  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
                  if (r.status === 'pending' && user.role !== 'super_admin') return alert('Access denied: only Super Admin may view pending request details');
                  setSelected(r);
                }}
                className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs flex-1 hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Inspect</span>
              </button>
              {activeStatus === "pending" && (
                <>
                  {/* Only render approve/reject buttons for super_admin */}
                  { (localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role === 'super_admin') ? (
                    <>
                      <button onClick={() => handleStatusUpdate(r._id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs hover:bg-green-700 transition">✓</button>
                      <button onClick={() => handleStatusUpdate(r._id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-xl text-xs hover:bg-red-700 transition">✕</button>
                    </>
                  ) : null }
                </>
              )}
            </div>
          </div>
          ))}
        </div>
      )}

      <div className="flex justify-center items-center gap-4 mt-10">
        <button disabled={page === 1} onClick={() => fetchRequests(page - 1)} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"><ChevronLeft /></button>
        <span className="font-bold text-slate-900 dark:text-slate-100">Page {page} of {pages}</span>
        <button disabled={page === pages} onClick={() => fetchRequests(page + 1)} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"><ChevronRight /></button>
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
    </div>
  );
}