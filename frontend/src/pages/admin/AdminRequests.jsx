import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Search, ArrowUpDown, Building2, Fingerprint, Eye, X, Save, Send, MessageSquare
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminRequests() {
  const [activeTab, setActiveTab] = useState("nimc"); // "nimc" or "cac"
  const [activeSubService, setActiveSubService] = useState("All");
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  const nimcSubServices = ["All", "Validation", "IP Clearance", "Modification", "Personalization", "Self-Service"];

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  const headers = { email: localStorage.getItem("email") || "" };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/admin/requests?page=1&limit=100&status=${filter}`, { headers });
      const rawData = res.data?.data || res.data?.requests || [];
      
      const filteredByModule = rawData.filter((item) => {
        if (!item) return false;
        if (activeTab === "cac") return item.service?.toLowerCase() === "cac";
        return item.service?.toLowerCase() !== "cac";
      });

      setRequests(filteredByModule);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [activeTab, filter]);

  const processedRequests = useMemo(() => {
    let data = [...requests];
    
    // Filter by Sub-Service (NIMC)
    if (activeTab === "nimc" && activeSubService !== "All") {
      data = data.filter(r => r.service?.toLowerCase() === activeSubService.toLowerCase());
    }

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(r => 
        r.userId?.email?.toLowerCase().includes(lower) ||
        r.nin?.toLowerCase().includes(lower) ||
        r.service?.toLowerCase().includes(lower)
      );
    }

    // Sort
    data.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return data;
  }, [requests, activeTab, activeSubService, searchTerm, sortOrder]);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-8 text-white mb-8">
        <h1 className="text-3xl font-bold">Operations Control</h1>
      </div>

      {/* Tabs & Filters */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => { setActiveTab("nimc"); setActiveSubService("All"); }} className={`px-6 py-3 font-bold rounded-2xl ${activeTab === "nimc" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>NIMC Services</button>
        <button onClick={() => setActiveTab("cac")} className={`px-6 py-3 font-bold rounded-2xl ${activeTab === "cac" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>CAC Services</button>
      </div>

      {/* NIMC Sub-Service Filter */}
      {activeTab === "nimc" && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {nimcSubServices.map(s => (
            <button key={s} onClick={() => setActiveSubService(s)} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeSubService === s ? "bg-black text-white" : "bg-white border"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Search & Sort */}
      <div className="flex gap-4 mb-8">
        <input type="text" placeholder="Search..." className="flex-1 p-3 border rounded-2xl" onChange={(e) => setSearchTerm(e.target.value)} />
        <button onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} className="p-3 border rounded-2xl"><ArrowUpDown size={20} /></button>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {processedRequests.map((r) => (
          <div key={r._id} className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-sm truncate">{r.userId?.email}</h3>
            <p className="text-xs text-blue-600 font-bold uppercase mt-1">{r.service}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setSelected(r)} className="bg-black text-white px-4 py-2 rounded-xl text-xs">Inspect</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}