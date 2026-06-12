import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Search, ArrowUpDown, Eye, CheckCircle2, XCircle, Clock3,
  ChevronLeft, ChevronRight, Fingerprint, Building2, AlertCircle,
  MessageSquare, Shield, Calendar
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

// 🔒 Data Masking Utility for Sensitive Fields
const maskNIN = (nin) => {
  if (!nin || nin === "N/A") return nin;
  return `${String(nin).slice(0, 4)}*****${String(nin).slice(-2)}`;
};

// 🎨 Status Badge Color Mapping
const statusColors = {
  "pending": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "in-progress": "bg-blue-100 text-blue-800 border border-blue-300",
  "processing": "bg-purple-100 text-purple-800 border border-purple-300",
  "approved": "bg-green-100 text-green-800 border border-green-300",
  "completed": "bg-emerald-100 text-emerald-800 border border-emerald-300",
  "rejected": "bg-red-100 text-red-800 border border-red-300",
  "failed": "bg-orange-100 text-orange-800 border border-orange-300"
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
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const nimcSubServices = ["All", "Validation", "IP Clearance", "Modification", "Personalization", "Self-Service"];
  const cacSubServices = ["All", "sole_proprietorship", "partnership", "limited_1m", "custom_ngo"];

  const serviceColors = {
    "Validation": "bg-blue-100 text-blue-800",
    "IP Clearance": "bg-purple-100 text-purple-800",
    "Modification": "bg-orange-100 text-orange-800",
    "Personalization": "bg-teal-100 text-teal-800",
    "Self-Service": "bg-pink-100 text-pink-800",
    "sole_proprietorship": "bg-slate-100 text-slate-800",
    "partnership": "bg-amber-100 text-amber-800",
    "limited_1m": "bg-lime-100 text-lime-800",
    "custom_ngo": "bg-cyan-100 text-cyan-800"
  };

  const token = localStorage.getItem("token")?.replace(/['"]+/g, "") || "";
  const authHeaders = {
    email: localStorage.getItem("email") || "",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchRequests = async (pageNum = page) => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/requests?page=${pageNum}&limit=12&status=${activeStatus}`, {
        headers: authHeaders
      });
      const data = res.data?.data || res.data?.requests || [];
      setRequests(data);
      setPages(res.data?.pagination?.pages || 1);
      setPage(pageNum);
    } catch (err) {
      console.error("Fetch Error:", err);
      setRequests([]);
    }
  };

  useEffect(() => { fetchRequests(page); }, [page, activeStatus]);

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
        await axios.put(`${API_BASE}/api/admin/approve-request/${id}`, {}, { 
          headers: authHeaders 
        });
      } else {
        await axios.put(`${API_BASE}/api/update-status/${id}`, { status }, { 
          headers: authHeaders 
        });
      }
      fetchRequests();
    } catch (err) {
      console.error("Status update failed:", err);
      alert(err.response?.data?.message || "Failed to update request status.");
    }
  };

  const displayedRequests = useMemo(() => {
    let filtered = requests.filter(r => {
      const isCac = r.pipelineSource === "cac";
      if (activeTab === "cac") {
        return isCac && (activeSubService === "All" || r.serviceType?.toLowerCase() === activeSubService.toLowerCase());
      }
      return !isCac && (activeSubService === "All" || r.service?.toLowerCase() === activeSubService.toLowerCase());
    });

    if (requesterRole && requesterRole !== "all") {
      filtered = filtered.filter(r => (r.userId?.role || "user") === requesterRole);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.userId?.email?.toLowerCase().includes(s) ||
        r.nin?.toLowerCase().includes(s) ||
        r.businessName1?.toLowerCase().includes(s) ||
        r.serviceType?.toLowerCase().includes(s) ||
        r.service?.toLowerCase().includes(s)
      );
    }

    return filtered.sort((a, b) => 
      sortOrder === "desc" ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [requests, activeTab, activeSubService, searchTerm, sortOrder]);

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
      <div className="flex gap-4 mb-6">
        {["nimc", "cac"].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setActiveSubService("All"); }} className={`px-6 py-3 font-bold rounded-2xl ${activeTab === tab ? "bg-black text-white" : "bg-gray-100"}`}>
            {tab.toUpperCase()} Services
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["pending", "in-progress", "processing", "approved", "completed", "rejected", "failed"].map(s => (
          <button key={s} onClick={() => { setActiveStatus(s); setPage(1); }} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${activeStatus === s ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-center mb-6">
        <label className="text-sm font-semibold">Requester:</label>
        <select value={requesterRole} onChange={(e) => setRequesterRole(e.target.value)} className="px-3 py-2 rounded-xl border bg-white text-sm">
          <option value="all">All</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <div className="ml-4 flex-1 flex items-center bg-white rounded-xl p-2 border">
          <Search className="mr-2" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by email or NIN" className="w-full outline-none" />
        </div>
      </div>

      {(activeTab === "nimc" || activeTab === "cac") && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(activeTab === "nimc" ? nimcSubServices : cacSubServices).map(s => (
            <button key={s} onClick={() => setActiveSubService(s)} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeSubService === s ? "bg-gray-800 text-white" : "bg-white border"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {displayedRequests.map(r => (
          <div key={r._id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-sm truncate text-slate-900">{r.userId?.email}</h3>
                <p className="text-xs text-slate-500 mt-1">ID: {r._id.slice(-6)}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${statusColors[r.status] || 'bg-gray-100'}`}>
                {r.status?.replace('-', ' ') || 'pending'}
              </span>
            </div>
            
            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${serviceColors[r.service || r.serviceType] || "bg-gray-100"}`}>
              {r.pipelineSource === "cac" ? (r.serviceType || "CAC") : (r.service || "General")}
            </span>
            
            <div className="mt-3 space-y-2 text-xs text-slate-600">
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
              <button onClick={() => setSelected(r)} className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs flex-1 hover:bg-black transition">
                {/* Inspect */}
              </button>
              {activeStatus === "pending" && (
                <>
                  <button onClick={() => handleStatusUpdate(r._id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs hover:bg-green-700 transition">✓</button>
                  <button onClick={() => handleStatusUpdate(r._id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-xl text-xs hover:bg-red-700 transition">✕</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center gap-4 mt-10">
        <button disabled={page === 1} onClick={() => fetchRequests(page - 1)} className="p-2 bg-gray-100 rounded-xl"><ChevronLeft /></button>
        <span className="font-bold">Page {page} of {pages}</span>
        <button disabled={page === pages} onClick={() => fetchRequests(page + 1)} className="p-2 bg-gray-100 rounded-xl"><ChevronRight /></button>
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-6">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0B1220] rounded-2xl p-6 shadow-lg overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Request Details</h2>
                <p className="text-sm text-slate-500">{getRequestTitle(selected)} — {selected.pipelineSource?.toUpperCase() || ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="px-3 py-2 rounded-xl bg-gray-100">Close</button>
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
                          <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
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
                        <div className="text-xs text-slate-500 font-semibold">{c.author}</div>
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