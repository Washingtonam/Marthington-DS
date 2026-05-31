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
  const [activeTab, setActiveTab] = useState("nimc");
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
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

      const data = res.data?.data || res.data?.requests || [];
      
      const filtered = data.filter((item) => {
        if (!item) return false;
        const service = (item.service || "").toLowerCase();
        if (activeTab === "cac") {
          return service === "cac" || item.businessType || item.proposedName1;
        } else {
          return service === "nimc" || service === "validation" || service === "modification" || item.nin;
        }
      });

      setRequests(filtered);
      setPages(res.data?.pagination?.pages || 1);
    } catch (err) {
      console.error("Fetch Error:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, filter, page]);

  const handleStatusTransition = async (id, targetStatus) => {
    if (!window.confirm(`Set status to ${targetStatus}?`)) return;
    try {
      setActionLoading(id);
      await axios.put(
        `${API_BASE}/api/admin/update-status/${id}`,
        { status: targetStatus, note: `Status updated to ${targetStatus}` },
        { headers }
      );
      setRequests(prev => prev.filter(r => r._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      alert("Update failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const saveNote = async () => {
    if (!selected?._id) return;
    setNoteSaving(true);
    try {
      await axios.put(`${API_BASE}/api/admin/update-notes/${selected._id}`, { adminNotes: note }, { headers });
      setSelected(prev => ({ ...prev, adminNotes: note }));
      alert("Notes synchronized.");
    } catch {
      alert("Save failed.");
    } finally {
      setNoteSaving(false);
    }
  };

  const addComment = async () => {
    if (!comment || !selected?._id) return;
    setCommentPushing(true);
    try {
      const payload = { text: comment, by: headers.email || "Admin" };
      await axios.post(`${API_BASE}/api/admin/requests/${selected._id}/comments`, payload, { headers });
      setSelected(prev => ({ ...prev, comments: [...(prev.comments || []), payload] }));
      setComment("");
    } catch {
      alert("Comment push failed.");
    } finally {
      setCommentPushing(false);
    }
  };

  const statusStyle = (status) => {
    const s = String(status).toLowerCase();
    if (s === "pending") return "bg-yellow-100 text-yellow-700";
    if (s === "approved" || s === "completed") return "bg-green-100 text-green-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-8 text-white mb-8">
        <h1 className="text-3xl font-bold mb-2">Operations Control</h1>
        <p className="text-blue-100 opacity-80">Manage {activeTab.toUpperCase()} stream lifecycle.</p>
      </div>

      <div className="flex gap-4 mb-6">
        {["nimc", "cac"].map(tab => (
          <button 
            key={tab} 
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`px-6 py-2 rounded-xl font-bold capitalize ${activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map(r => (
            <div key={r._id} className="bg-white p-6 rounded-3xl border shadow-sm">
              <div className="flex justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle(r.status)}`}>{r.status}</span>
                <span className="text-xs font-mono text-gray-400">ID: {r._id.slice(-4)}</span>
              </div>
              <h2 className="font-bold mb-2">{r.userId?.email || "N/A"}</h2>
              <div className="text-sm text-gray-600 mb-4">{r.service || "Standard Entry"}</div>
              <button onClick={() => { setSelected(r); setNote(r.adminNotes || ""); }} className="w-full bg-black text-white py-2 rounded-xl text-xs font-bold">Inspect</button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Details</h2>
              <button onClick={() => setSelected(null)}><X /></button>
            </div>
            
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border rounded-xl p-3 mb-4 h-24" />
            <button onClick={saveNote} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mb-6">Save Notes</button>

            <div className="space-y-4">
              <h3 className="font-bold text-sm">Audit Trail</h3>
              {(selected.comments || []).map((c, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-lg text-xs">{c.text}</div>
              ))}
              <div className="flex gap-2">
                <input value={comment} onChange={(e) => setComment(e.target.value)} className="flex-1 border rounded-xl p-3" placeholder="New comment..." />
                <button onClick={addComment} className="bg-blue-600 text-white px-4 rounded-xl font-bold">Push</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}