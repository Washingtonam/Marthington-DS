import React, { useEffect, useState } from "react";
import api from "../../lib/axios";
import { SERVICE_TYPE_OPTIONS } from "../../config/serviceTypes";
import {
  Search, ArrowUpDown, Eye, CheckCircle2, XCircle, Clock3,
  ChevronLeft, ChevronRight, Fingerprint, Building2, AlertCircle,
  MessageSquare, Shield, Calendar
} from "lucide-react";

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
  const [modalStatus, setModalStatus] = useState("");
  const [modalComment, setModalComment] = useState("");
  const [requesterRole, setRequesterRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const nimcSubServices = ["All", "Validation", "IP Clearance", "Modification", "Personalization", "Self-Service"];
  const cacSubServices = ["All", "sole_proprietorship", "partnership", "limited_1m", "custom_ngo"];

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
    try {
      const params = {
        page: pageNum,
        limit: 12,
        status: activeStatus,
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
      <div className="flex gap-4 mb-6 flex-wrap">
        {["nimc", "cac"].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setActiveSubService("All"); }} className={`px-6 py-3 font-bold rounded-2xl transition ${activeTab === tab ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
            {tab.toUpperCase()} Services
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["pending", "approved", "in-progress", "processing", "completed", "rejected", "failed"].map(s => (
          <button key={s} onClick={() => { setActiveStatus(s); setPage(1); }} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${activeStatus === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Requester:</label>
        <select value={requesterRole} onChange={(e) => setRequesterRole(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <option value="all">All</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <div className="ml-4 flex-1 flex items-center rounded-xl p-2 border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
          <Search className="mr-2 text-slate-500 dark:text-slate-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by email, NIN, service or ID" className="w-full outline-none bg-transparent text-slate-900 dark:text-slate-100" />
        </div>
        <button onClick={applyFilters} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-200 dark:text-slate-950">Apply</button>
      </div>

      {(activeTab === "nimc" || activeTab === "cac") && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(activeTab === "nimc" ? nimcSubServices : cacSubServices).map(s => (
            <button key={s} onClick={() => setActiveSubService(s)} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeSubService === s ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {displayedRequests.map(r => (
          <div key={r._id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
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
            
              <div className="mt-4 flex gap-2">
              <button 
                onClick={() => {
                  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
                  if (r.status === 'pending' && user.role !== 'super_admin') return alert('Access denied: only Super Admin may view pending request details');
                  setSelected(r);
                }}
                className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs flex-1 hover:bg-slate-800 transition"
              >
                {/* Inspect */}
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

      <div className="flex justify-center items-center gap-4 mt-10">
        <button disabled={page === 1} onClick={() => fetchRequests(page - 1)} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"><ChevronLeft /></button>
        <span className="font-bold text-slate-900 dark:text-slate-100">Page {page} of {pages}</span>
        <button disabled={page === pages} onClick={() => fetchRequests(page + 1)} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"><ChevronRight /></button>
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-6">
          <div className="w-full max-w-3xl bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 rounded-2xl p-6 shadow-lg overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Request Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{getRequestTitle(selected)} — {selected.pipelineSource?.toUpperCase() || ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">Close</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-slate-500">Requester</p>
                <p className="font-semibold">{selected.userId?.email} <span className="text-sm font-normal">({selected.userId?.role || 'user'})</span></p>
                <p className="text-xs text-slate-500 mt-2">Status</p>
                <p className="font-semibold">{selected.status}</p>
                <p className="text-xs text-slate-500 mt-2">Submitted</p>
                <p className="font-semibold">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Reference</p>
                <p className="font-semibold">{selected.nin || selected.businessName1 || selected.serviceType || 'N/A'}</p>
                <p className="text-xs text-slate-500 mt-2">Amount</p>
                <p className="font-semibold">{selected.amount || selected.amountCharged || 0}</p>
                <p className="text-xs text-slate-500 mt-2">Pipeline</p>
                <p className="font-semibold">{selected.pipelineSource}</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2">Request Data</h3>
              {getRequestDetails(selected).length > 0 ? (
                <div className="grid gap-2">
                  {getRequestDetails(selected).map(({ key, value }) => (
                    <div key={key} className="flex gap-4 items-start">
                      <div className="w-40 text-sm text-slate-500">{key}</div>
                      <div className="flex-1 text-sm break-words">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No request data available.</p>
              )}

              {selected.formData && Object.keys(selected.formData).length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Form Data</h4>
                  <div className="grid gap-2">
                    {Object.entries(selected.formData).map(([k, v]) => (
                      <div key={k} className="flex gap-4 items-start">
                        <div className="w-40 text-sm text-slate-500">{k}</div>
                        <div className="flex-1 text-sm break-words">{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History Timeline */}
              <div className="mt-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Status Timeline
                </h3>
                {Array.isArray(selected.statusHistory) && selected.statusHistory.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {[...selected.statusHistory].reverse().map((item, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border-l-4 ${statusColors[item.status] || 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(item.status)}
                          <span className="font-semibold capitalize text-sm">{item.status}</span>
                          {item.actorRole ? (
                            <span className="text-xs text-slate-500 ml-2 uppercase font-semibold">{item.actorRole}</span>
                          ) : (
                            <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                          )}
                          <span className="text-xs text-slate-500 ml-2">{!item.actorRole && new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        {item.note && <div className="text-sm text-slate-700 ml-6">{item.note}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No status history.</p>
                )}
              </div>

              {/* Admin Comments Timeline */}
              <div className="mt-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Admin Comments
                </h3>
                {Array.isArray(selected.adminComments) && selected.adminComments.length > 0 ? (
                  <div className="space-y-3 max-h-48 overflow-auto">
                    {[...selected.adminComments].reverse().map((c, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-500 font-semibold">{c.authorRole || c.author}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{new Date(c.createdAt).toLocaleString()}</div>
                        <div className="mt-2 text-sm text-slate-700">{c.comment}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No comments yet.</p>
                )}
              </div>

              {/* Status Update Section */}
              <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-900">
                  <Shield className="w-4 h-4" />
                  Resolution Actions
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">New Status</label>
                    <select 
                      value={modalStatus} 
                      onChange={(e) => setModalStatus(e.target.value)} 
                      className="w-full p-3 rounded-xl border border-blue-300 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">📋 Pending</option>
                      <option value="in-progress">⏳ In Progress</option>
                      <option value="processing">🔄 Processing</option>
                      <option value="approved">✅ Approved</option>
                      <option value="completed">🎉 Completed</option>
                      <option value="rejected">❌ Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Comment/Resolution Note
                      {modalStatus === 'rejected' && <span className="text-red-600 ml-1">*Required for rejection</span>}
                    </label>
                    <textarea 
                      value={modalComment} 
                      onChange={(e) => setModalComment(e.target.value)} 
                      placeholder={
                        modalStatus === 'rejected' 
                          ? "Explain why this request was rejected..." 
                          : "Add a resolution note or comment..."
                      }
                      className="w-full p-3 rounded-xl border border-blue-300 mt-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                    />
                  </div>

                    <div className="flex gap-2 pt-2">
                    <button 
                      onClick={async () => {
                        if (modalStatus === 'rejected' && (!modalComment || modalComment.trim().length < 5)) {
                          return alert('Please provide a detailed rejection reason (at least 5 characters).');
                        }
                        // Block non-super-admins from updating pending records
                        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
                        if (selected.status === 'pending' && user.role !== 'super_admin') {
                          return alert('Forbidden: Only Super Admin may modify pending requests.');
                        }
                        try {
                          await axios.put(`${API_BASE}/api/admin/status/${selected._id}`, { status: modalStatus, note: modalComment }, { headers: authHeaders });
                          alert('✅ Status updated successfully');
                          setSelected(null);
                          fetchRequests();
                        } catch (err) {
                          console.error('Status update error:', err);
                          alert(err.response?.data?.message || '❌ Failed to update status');
                        }
                      }} 
                      className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                    >
                      Update Status
                    </button>
                    <button 
                      onClick={() => { setModalStatus(selected.status || "pending"); setModalComment(""); }} 
                      className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}