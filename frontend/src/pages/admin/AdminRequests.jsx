import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Search, ArrowUpDown, Eye, CheckCircle2, XCircle, Clock3,
  ChevronLeft, ChevronRight, Fingerprint, Building2
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

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

  const serviceColors = {
    "Validation": "bg-blue-100 text-blue-800",
    "IP Clearance": "bg-purple-100 text-purple-800",
    "Modification": "bg-orange-100 text-orange-800",
    "Personalization": "bg-teal-100 text-teal-800",
    "Self-Service": "bg-pink-100 text-pink-800"
  };

  const token = localStorage.getItem("token")?.replace(/['"]+/g, "") || "";
  const authHeaders = {
    email: localStorage.getItem("email") || "",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/requests?page=${page}&limit=12&status=${activeStatus}`, {
        headers: authHeaders
      });
      const data = res.data?.data || res.data?.requests || [];
      setRequests(data);
      setPages(res.data?.pagination?.pages || 1);
    } catch (err) {
      console.error("Fetch Error:", err);
      setRequests([]);
    }
  };

  useEffect(() => { fetchRequests(); }, [page, activeStatus]);

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
      if (activeTab === "cac") return isCac;
      return !isCac && (activeSubService === "All" || r.service?.toLowerCase() === activeSubService.toLowerCase());
    });

    if (requesterRole && requesterRole !== "all") {
      filtered = filtered.filter(r => (r.userId?.role || "user") === requesterRole);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.userId?.email?.toLowerCase().includes(s) || r.nin?.toLowerCase().includes(s))
      );
    }

    return filtered.sort((a, b) => 
      sortOrder === "desc" ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [requests, activeTab, activeSubService, searchTerm, sortOrder]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-4 mb-6">
        {["nimc", "cac"].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setActiveSubService("All"); }} className={`px-6 py-3 font-bold rounded-2xl ${activeTab === tab ? "bg-black text-white" : "bg-gray-100"}`}>
            {tab.toUpperCase()} Services
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {["pending", "approved", "rejected"].map(s => (
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

      {activeTab === "nimc" && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {nimcSubServices.map(s => (
            <button key={s} onClick={() => setActiveSubService(s)} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeSubService === s ? "bg-gray-800 text-white" : "bg-white border"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {displayedRequests.map(r => (
          <div key={r._id} className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-sm truncate">{r.userId?.email}</h3>
            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${serviceColors[r.service] || "bg-gray-100"}`}>
              {r.service || "General"}
            </span>
            <div className="mt-2 text-xs text-slate-500">Requested by: <span className="font-semibold">{r.userId?.role || 'user'}</span></div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setSelected(r)} className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs flex-1">Inspect</button>
              {activeStatus === "pending" && (
                <>
                  <button onClick={() => handleStatusUpdate(r._id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs">Approve</button>
                  <button onClick={() => handleStatusUpdate(r._id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-xl text-xs">Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center gap-4 mt-10">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 bg-gray-100 rounded-xl"><ChevronLeft /></button>
        <span className="font-bold">Page {page} of {pages}</span>
        <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="p-2 bg-gray-100 rounded-xl"><ChevronRight /></button>
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-6">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0B1220] rounded-2xl p-6 shadow-lg overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Request Details</h2>
                <p className="text-sm text-slate-500">{selected.service} — {selected.pipelineSource?.toUpperCase() || ''}</p>
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
                <p className="text-xs text-slate-500">NIN</p>
                <p className="font-semibold">{selected.nin || 'N/A'}</p>
                <p className="text-xs text-slate-500 mt-2">Amount</p>
                <p className="font-semibold">{selected.amount ? `${selected.amount}` : '0'}</p>
                <p className="text-xs text-slate-500 mt-2">Pipeline</p>
                <p className="font-semibold">{selected.pipelineSource}</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2">Form Data</h3>
              {selected.formData && Object.keys(selected.formData).length > 0 ? (
                <div className="grid gap-2">
                  {Object.entries(selected.formData).map(([k, v]) => (
                    <div key={k} className="flex gap-4 items-start">
                      <div className="w-40 text-sm text-slate-500">{k}</div>
                      <div className="flex-1 text-sm break-words">{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No form data attached.</p>
              )}

              <div className="mt-6">
                <h3 className="font-bold mb-2">Admin Actions</h3>
                <label className="text-sm">Status</label>
                <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value)} className="w-full p-3 rounded-xl border mt-2">
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="processing">Processing</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>

                <label className="text-sm mt-4 block">Comment</label>
                <textarea value={modalComment} onChange={(e) => setModalComment(e.target.value)} placeholder="Add internal or user-facing comment" className="w-full p-3 rounded-xl border mt-2 h-28" />

                <div className="flex gap-2 mt-4">
                  <button onClick={async () => {
                    if (modalStatus === 'rejected' && (!modalComment || modalComment.trim().length < 3)) {
                      return alert('Please provide a comment when rejecting a request.');
                    }
                    try {
                      const { data } = await axios.put(`${API_BASE}/api/admin/status/${selected._id}`, { status: modalStatus, note: modalComment }, { headers: authHeaders });
                      alert(data.message || 'Status updated');
                      setSelected(data.data || data);
                      fetchRequests();
                    } catch (err) {
                      console.error('Status update error:', err);
                      alert(err.response?.data?.message || 'Failed to update status');
                    }
                  }} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Update Status</button>
                  <button onClick={() => setModalComment('')} className="px-4 py-2 rounded-xl bg-gray-100">Clear</button>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Comment Thread</h4>
                  {Array.isArray(selected.adminComments) && selected.adminComments.length > 0 ? (
                    <div className="space-y-3 max-h-40 overflow-auto">
                      {selected.adminComments.map((c, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50">
                          <div className="text-xs text-slate-500">{c.author} — {new Date(c.createdAt).toLocaleString()}</div>
                          <div className="mt-1 text-sm">{c.comment}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}