import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  CheckCircle2, XCircle, Clock3, Eye, MessageSquare, ShieldCheck,
  FileText, User, ChevronLeft, ChevronRight, Save, Send,
  BadgeCheck, X, Building2, Fingerprint, Search, ArrowUpDown
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminRequests() {
  const [activeTab, setActiveTab] = useState("nimc");
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [commentPushing, setCommentPushing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

  const headers = { email: localStorage.getItem("email") || "" };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/api/admin/requests?page=${page}&limit=${LIMIT}&status=${filter}`,
        { headers }
      );
      const rawData = res.data?.data || res.data?.requests || [];
      const filteredByModule = rawData.filter((item) => {
        if (!item) return false;
        if (activeTab === "cac") return item.service?.toLowerCase() === "cac" || item.businessType || item.proposedName1;
        return item.service?.toLowerCase() === "nimc" || item.service?.toLowerCase() === "validation" || 
               item.service?.toLowerCase() === "modification" || item.nin || (!item.proposedName1 && item.service?.toLowerCase() !== "cac");
      });
      setRequests(filteredByModule);
      setPages(res.data?.pagination?.pages || 1);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, filter, page]);

  const processedRequests = useMemo(() => {
    let data = [...requests];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(r => 
        r.userId?.email?.toLowerCase().includes(lower) ||
        r.nin?.toLowerCase().includes(lower) ||
        r.proposedName1?.toLowerCase().includes(lower) ||
        r.businessType?.toLowerCase().includes(lower)
      );
    }
    data.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
    return data;
  }, [requests, searchTerm, sortOrder]);

  const handleStatusTransition = async (id, targetStatus) => {
    if (!window.confirm(`Mark as ${targetStatus}?`)) return;
    try {
      setActionLoading(id);
      await axios.put(`${API_BASE}/api/admin/update-status/${id}`, { status: targetStatus }, { headers });
      setRequests(prev => prev.filter(r => r._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch (err) { alert("Failed to update."); }
    finally { setActionLoading(null); }
  };

  const statusStyle = (status) => {
    switch (String(status).toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "approved": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "completed": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "failed": case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">Operations Control</h1>
        <p className="text-blue-100 opacity-90 max-w-xl">Manage internal data streams, filings, and status lifecycles.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input type="text" placeholder="Search by email, NIN, or business name..." className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 dark:bg-[#161616] dark:border-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} className="px-5 py-3 bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 rounded-2xl font-bold flex items-center gap-2">
          <ArrowUpDown size={16} /> {sortOrder === "desc" ? "Newest" : "Oldest"}
        </button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-8 gap-2">
        <button onClick={() => { setActiveTab("nimc"); setPage(1); }} className={`px-6 py-3 font-bold text-sm border-b-2 ${activeTab === "nimc" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>NIMC</button>
        <button onClick={() => { setActiveTab("cac"); setPage(1); }} className={`px-6 py-3 font-bold text-sm border-b-2 ${activeTab === "cac" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}>CAC</button>
      </div>

      {loading ? (
        <div className="text-center p-16">Syncing data...</div>
      ) : processedRequests.length === 0 ? (
        <div className="text-center p-16">No entries matching your criteria.</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {processedRequests.map((r) => (
            <div key={r._id} className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-sm truncate">{r.userId?.email || "No User"}</h2>
              <span className={`text-xs px-2 py-1 rounded-full ${statusStyle(r.status)}`}>{r.status}</span>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setSelected(r); setNote(r.adminNotes || ""); }} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs">Inspect</button>
                {r.status === "pending" && <button onClick={() => handleStatusTransition(r._id, "approved")} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs">Pass</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-[#111111] w-full max-w-2xl rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-4">Inspection</h2>
            <p className="mb-4 text-sm">{selected.userId?.email}</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full h-20 p-2 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <button onClick={() => setSelected(null)} className="mt-4 bg-red-500 text-white px-4 py-2 rounded-xl">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}