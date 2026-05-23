import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Eye,
  MessageSquare,
  ShieldCheck,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  BadgeCheck,
  X,
  Building2,
  Fingerprint
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminRequests() {
  // Navigation & Data States
  const [activeTab, setActiveTab] = useState("nimc"); // "nimc" or "cac"
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  
  // Custom operational states
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [commentPushing, setCommentPushing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

  const headers = {
    email: localStorage.getItem("email") || "",
  };

  // =========================
  // api PIPELINE REQUESTS
  // =========================
  const apiRequests = async () => {
    try {
      setLoading(true);
      
      // 1. Point to the single functional backend route using the current filter status
      const res = await axios.get(
        `${API_BASE}/api/admin/requests?page=${page}&limit=${LIMIT}&status=${filter}`,
        { headers }
      );

      // 2. Extract database payload array safely
      const apiedData = res.data?.data || res.data?.requests || [];
      
      // 3. Client-side partitioning logic for tabs (CAC vs NIMC)
      const filteredByModule =  apiedData.filter((item) => {
        if (!item) return false;
        
        if (activeTab === "cac") {
          return (
            item.service?.toLowerCase() === "cac" || 
            item.businessType || 
            item.proposedName1
          );
        } else {
          // Captures validation, modification, or standard NIMC tracking structures safely
          return (
            item.service?.toLowerCase() === "nimc" || 
            item.service?.toLowerCase() === "validation" || 
            item.service?.toLowerCase() === "modification" || 
            item.nin || 
            (!item.proposedName1 && item.service?.toLowerCase() !== "cac")
          );
        }
      });

      setRequests(filteredByModule);
      setPages(res.data?.pagination?.pages || 1);
    } catch (err) {
      console.error("FETCH PIPELINE ERROR:", err.response?.data || err.message);
      setRequests([]);
    } finally {
      loading && setLoading(false);
    }
  };

  useEffect(() => {
     apiRequests();
  }, [activeTab, filter, page]);

  // ===============================================
  // UNIFIED PIPELINE STATE MODULATION CONTROLLER
  // ===============================================
  const handleStatusTransition = async (id, targetStatus) => {
    if (!window.confirm(`Are you sure you want to mark this transaction as ${targetStatus}?`)) return;
    try {
      setActionLoading(id);
      
      const res = await axios.put(
        `${API_BASE}/api/admin/update-status/${id}`,
        { 
          status: targetStatus,
          note: `Status altered to ${targetStatus} via central management panel.`
        },
        { headers }
      );

      if (res.data?.success || res.status === 200) {
        setRequests(prev => prev.filter(r => r._id !== id));
        if (selected?._id === id) {
          setSelected(null);
        }
         apiRequests(); // Re-sync frame elements
      } else {
        alert(res.data?.message || "Failed to update record state.");
      }
    } catch (err) {
      console.error("STATUS MODULATION FAILED:", err.response?.data || err.message);
      alert("Error processing pipeline execution cycle.");
    } finally {
      setActionLoading(null);
    }
  };

  // =========================
  // MODAL CORE INTERACTIVE MAPPINGS
  // =========================
  const open = (r) => {
    setSelected(r);
    setNote(r.adminNotes || "");
  };

  const saveNote = async () => {
    if (!selected?._id) return;
    try {
      setNoteSaving(true);
      const res = await axios.put(
        `${API_BASE}/api/admin/update-notes/${selected._id}`,
        { adminNotes: note },
        { headers }
      );
      
      if (res.data?.success || res.status === 200) {
        setSelected(prev => ({ ...prev, adminNotes: note }));
        alert("Internal structural field notes synchronized successfully.");
      }
    } catch (err) {
      console.error("NOTE SAVING ERROR:", err.response?.data || err.message);
      alert("Failed to update application records safely.");
    } finally {
      setNoteSaving(false);
    }
  };

  const addComment = async () => {
    if (!comment || !selected?._id) return;
    try {
      setCommentPushing(true);
      const payloadComment = { text: comment, by: headers.email || "System Admin" };
      
      const res = await axios.post(
        `${API_BASE}/api/admin/requests/${selected._id}/comments`,
        payloadComment,
        { headers }
      );

      if (res.data?.success || res.status === 200) {
        setSelected(prev => ({
          ...prev,
          comments: [...(prev.comments || []), res.data?.comment || payloadComment]
        }));
        setComment("");
      }
    } catch (err) {
      console.error("COMMENT CORRELATION RUNTIME ERROR:", err.response?.data || err.message);
      // Fallback optimistic update if specific backend route variant is structurally identical
      setSelected(prev => ({
        ...prev,
        comments: [...(prev.comments || []), { text: comment, by: headers.email || "System Admin" }]
      }));
      setComment("");
    } finally {
      setCommentPushing(false);
    }
  };

  // =========================
  // DESIGN & VISUAL THEMES
  // =========================
  const statusStyle = (status) => {
    switch (String(status).toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "approved": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "completed": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "failed":
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Live indicators computed on current visible workspace set
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved" || r.status === "completed").length;
  const rejectedCount = requests.filter(r => r.status === "rejected" || r.status === "failed").length;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">

      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={20} className="text-blue-400" />
              <span className="uppercase tracking-widest text-sm opacity-80 font-semibold">
                Centralized Workspace
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">
              Operations Control
            </h1>
            <p className="text-blue-100 max-w-2xl text-sm md:text-base opacity-90">
              Manage internal data streams seamlessly. Review regulatory filings, cross-examine
              identities, and update lifecycle statuses for infrastructure records dynamically.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10 min-w-[260px]">
            <p className="text-xs text-blue-200 mb-1 uppercase tracking-wider font-semibold">System Pipeline Mode</p>
            <h2 className="text-2xl font-bold uppercase tracking-wide text-white flex items-center gap-2">
              {activeTab === "cac" ? <Building2 size={22} /> : <Fingerprint size={22} />}
              {activeTab} Module
            </h2>
          </div>
        </div>
      </div>

      {/* CORE PIPELINE MATRIX TABS SWITCHER */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-8 gap-2">
        <button
          onClick={() => { setActiveTab("nimc"); setPage(1); }}
          className={`px-6 py-3 font-bold text-sm transition-all rounded-t-2xl flex items-center gap-2 border-b-2 ${
            activeTab === "nimc"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Fingerprint size={18} />
          NIMC Services Pipeline
        </button>
        <button
          onClick={() => { setActiveTab("cac"); setPage(1); }}
          className={`px-6 py-3 font-bold text-sm transition-all rounded-t-2xl flex items-center gap-2 border-b-2 ${
            activeTab === "cac"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Building2 size={18} />
          CAC Registrations Registry
        </button>
      </div>

      {/* LIVE METRICS TILES */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Awaiting Processing</p>
              <h2 className="text-4xl font-bold dark:text-white">{pendingCount}</h2>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-950/40 p-4 rounded-2xl">
              <Clock3 className="text-yellow-700 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Passed / Fulfilled</p>
              <h2 className="text-4xl font-bold dark:text-white">{approvedCount}</h2>
            </div>
            <div className="bg-green-100 dark:bg-green-950/40 p-4 rounded-2xl">
              <BadgeCheck className="text-green-700 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Failed / Rejected</p>
              <h2 className="text-4xl font-bold dark:text-white">{rejectedCount}</h2>
            </div>
            <div className="bg-red-100 dark:bg-red-950/40 p-4 rounded-2xl">
              <XCircle className="text-red-700 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* MATRIX FLOW STATUS FILTERS */}
      <div className="flex gap-2 flex-wrap mb-8">
        {["pending", "approved", "completed", "rejected", "failed"].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              filter === f
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-white dark:bg-[#161616] dark:text-white border border-gray-200 dark:border-gray-800 hover:shadow-md"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* LOADER ELEMENT */}
      {loading && (
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-16 text-center border border-gray-100 dark:border-gray-800">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Syncing active system data streams...</p>
        </div>
      )}

      {/* BLANK SCREEN FALLBACK */}
      {!loading && requests.length === 0 && (
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-16 text-center border border-gray-200 dark:border-gray-800">
          <FileText size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No operational entries matching criteria.</p>
        </div>
      )}

      {/* DASHBOARD ENTRIES GRID */}
      {!loading && requests.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((r) => (
            <div
              key={r._id}
              className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col justify-between"
            >
              <div>
                {/* CARD TITLE BAR */}
                <div className={`p-5 text-white bg-gradient-to-r ${activeTab === 'cac' ? 'from-indigo-600 to-purple-600' : 'from-blue-600 to-indigo-600'}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="text-xs font-mono tracking-wider opacity-90 truncate max-w-[150px]">
                          ID: #{r._id ? r._id.slice(-6) : "N/A"}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${statusStyle(r.status)}`}>
                          {r.status || "Pending"}
                        </span>
                      </div>
                      <h2 className="font-bold text-sm truncate block" title={r.userId?.email}>
                        {r.userId?.email || "No User Context Linked"}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* FILE ATTRIBUTE METRICS GRID */}
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800/50 pb-2">
                    <span className="text-gray-400 font-medium">Service Category</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100 capitalize">
                      {r.service || r.businessType || "Registration Engine"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800/50 pb-2">
                    <span className="text-gray-400 font-medium">Primary Pointer</span>
                    <span className="font-mono font-bold text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                      {r.nin || r.proposedName1 || "System Entry"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Value Exchanged</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400 text-base">
                      ₦{(r.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD ACTIONS AREA */}
              <div className="p-5 pt-0 border-t border-gray-50 dark:border-gray-800/40 mt-2">
                <p className="text-[11px] font-mono text-gray-400 mb-4 pt-3">
                  STAGED: {r.createdAt ? new Date(r.createdAt).toLocaleString() : "N/A"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => open(r)}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Eye size={14} />
                    Inspect File
                  </button>

                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatusTransition(r._id, "approved")}
                        disabled={actionLoading === r._id}
                        className="px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs transition"
                      >
                        Pass
                      </button>
                      <button
                        onClick={() => handleStatusTransition(r._id, "rejected")}
                        disabled={actionLoading === r._id}
                        className="px-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs transition"
                      >
                        Fail
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SYSTEM LIST PAGINATION BANNER */}
      {!loading && pages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-12">
          <button
            disabled={page === 1}
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 dark:text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-md">
            Matrix Tier {page} / {pages}
          </div>
          <button
            disabled={page === pages}
            onClick={() => setPage(prev => Math.min(prev + 1, pages))}
            className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 dark:text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* PRIMARY FILE DETAILED INSPECTION MODAL PANEL */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111111] w-full max-w-5xl rounded-3xl my-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-800">
            
            {/* PANEL TITLE BAR */}
            <div className="sticky top-0 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 p-6 z-10 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Inspection Monitor</h2>
                <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider font-mono">Context Stream: {activeTab}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 p-2.5 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* EXPANDED DATA GRID */}
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 dark:bg-[#181818] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5 mb-4">
                  <User size={18} className="text-blue-500" />
                  <h3 className="font-extrabold text-sm dark:text-white uppercase tracking-wider">User Node Parameters</h3>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white dark:bg-[#111111] rounded-xl p-3.5 border border-gray-100 dark:border-gray-800/80">
                    <span className="text-gray-400 block mb-1">Email Connection</span>
                    <strong className="dark:text-white break-all text-sm font-medium">{selected.userId?.email || "N/A"}</strong>
                  </div>
                  <div className="bg-white dark:bg-[#111111] rounded-xl p-3.5 border border-gray-100 dark:border-gray-800/80">
                    <span className="text-gray-400 block mb-1">Mobile Line</span>
                    <strong className="dark:text-white text-sm font-mono">{selected.userId?.phoneNumber || "Unspecified"}</strong>
                  </div>
                  <div className="bg-white dark:bg-[#111111] rounded-xl p-3.5 border border-gray-100 dark:border-gray-800/80">
                    <span className="text-gray-400 block mb-1">Operational Lifecycle State</span>
                    <strong className="dark:text-white text-sm uppercase tracking-wider block mt-0.5 text-indigo-500">{selected.status}</strong>
                  </div>
                </div>
              </div>

              {/* ADMINISTRATIVE NOTATIONS CONTAINER */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5 mb-3">
                  <FileText size={18} className="text-indigo-500" />
                  <h3 className="font-extrabold text-sm dark:text-white uppercase tracking-wider">Internal Back-Office Notes</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Input engineering and support deployment notes..."
                    className="w-full text-xs border border-gray-200 dark:border-gray-700 dark:bg-[#111111] dark:text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  />
                  <button
                    onClick={saveNote}
                    disabled={noteSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap self-stretch sm:self-end h-11"
                  >
                    <Save size={14} /> {noteSaving ? "Saving..." : "Commit Notes"}
                  </button>
                </div>
              </div>

              {/* SCHEMA PAYLOAD ATTRIBUTES DETECTOR */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                <h3 className="font-extrabold text-sm mb-4 dark:text-white uppercase tracking-wider">Decoded Schema Metadata Payload</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries({
                    ...(selected.formData || {}),
                    serviceType: selected.service || selected.type || "Undefined",
                    ...(selected.proposedName1 && { nameOption1: selected.proposedName1 }),
                    ...(selected.proposedName2 && { nameOption2: selected.proposedName2 }),
                    ...(selected.nin && { targetedIdentificationNIN: selected.nin })
                  }).map(([key, val]) => (
                    <div key={key} className="bg-white dark:bg-[#111111] border border-gray-50 dark:border-gray-800/80 rounded-xl p-3.5">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-1">{key}</p>
                      <p className="text-xs font-semibold dark:text-white break-words">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* MULTI-MEDIA MEDIA CONTAINER */}
              {(selected.proof || selected.passport || selected.documentUrl) && (
                <div className="grid md:grid-cols-2 gap-6">
                  {selected.proof && (
                    <div className="bg-gray-50 dark:bg-[#181818] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                      <h4 className="font-extrabold text-xs mb-3 dark:text-white uppercase tracking-wider">Payment Instrument Voucher</h4>
                      <img
                        src={selected.proof}
                        alt="Transaction Proof Document"
                        onClick={() => setPreviewImage(selected.proof)}
                        className="w-full h-56 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-zoom-in hover:opacity-95 transition"
                      />
                    </div>
                  )}

                  {selected.passport && (
                    <div className="bg-gray-50 dark:bg-[#181818] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                      <h4 className="font-extrabold text-xs mb-3 dark:text-white uppercase tracking-wider">Biometric Portrait Capture</h4>
                      <div className="flex justify-start">
                        <img
                          src={selected.passport}
                          alt="User Profile Passport"
                          onClick={() => setPreviewImage(selected.passport)}
                          className="w-44 h-44 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-zoom-in hover:opacity-95 transition"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AUDIT LOG COMMENTS SECTION */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare size={16} className="text-blue-500" />
                  <h3 className="font-extrabold text-sm dark:text-white uppercase tracking-wider">Internal Audit Annotations</h3>
                </div>
                
                <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
                  {selected.comments?.length > 0 ? (
                    selected.comments.map((c, i) => (
                      <div key={i} className="bg-white dark:bg-[#111111] border border-gray-50 dark:border-gray-800 rounded-xl p-3">
                        <p className="font-mono text-[10px] text-gray-400 mb-1">{c.by}</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white dark:bg-[#111111] text-center py-6 text-xs text-gray-400 font-medium rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                      No operational workspace updates appended.
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Type transaction log entry annotation note..."
                    className="flex-1 text-xs border border-gray-200 dark:border-gray-700 dark:bg-[#111111] dark:text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addComment}
                    disabled={commentPushing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Send size={12} /> {commentPushing ? "Pushing..." : "Push"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* FULL LAYER LIGHTBOX FOR IMAGES */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex justify-center items-center p-4">
          <div className="relative max-w-4xl w-full flex flex-col items-end">
            <button
              onClick={() => setPreviewImage(null)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl mb-3 flex items-center gap-1 transition shadow-lg"
            >
              <X size={14} /> Exit Lightbox
            </button>
            <img
              src={previewImage}
              alt="Fullscreen View Document"
              className="w-full max-h-[82vh] object-contain rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800"
            />
          </div>
        </div>
      )}

    </div>
  );
}