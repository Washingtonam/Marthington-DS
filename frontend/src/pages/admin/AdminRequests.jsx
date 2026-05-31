import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Search, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, 
  XCircle, Clock3, Eye, Building2, Fingerprint 
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminRequests() {
  const [activeTab, setActiveTab] = useState("nimc");
  const [activeSubService, setActiveSubService] = useState("All");
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const nimcSubServices = ["All", "Validation", "IP Clearance", "Modification", "Personalization", "Self-Service"];
  const headers = { email: localStorage.getItem("email") || "" };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/requests?page=${page}&limit=20&status=${filter}`, { headers });
      setRequests(res.data?.data || []);
      setPages(res.data?.pagination?.pages || 1);
    } catch (err) { console.error("Fetch Error:", err); }
  };

  useEffect(() => { fetchRequests(); }, [page, filter]);

  const handleStatus = async (id, status) => {
    if (!window.confirm(`Confirm ${status}?`)) return;
    await axios.put(`${API_BASE}/api/admin/update-status/${id}`, { status }, { headers });
    fetchRequests();
  };

  const getServiceColor = (service) => {
    const colors = {
      "Validation": "bg-purple-100 text-purple-700",
      "IP Clearance": "bg-blue-100 text-blue-700",
      "Modification": "bg-amber-100 text-amber-700",
      "Personalization": "bg-pink-100 text-pink-700",
      "Self-Service": "bg-teal-100 text-teal-700"
    };
    return colors[service] || "bg-gray-100 text-gray-700";
  };

  const processed = useMemo(() => {
    let data = requests.filter(r => activeTab === "cac" ? r.service?.toLowerCase() === "cac" : r.service?.toLowerCase() !== "cac");
    if (activeSubService !== "All") data = data.filter(r => r.service === activeSubService);
    return data;
  }, [requests, activeTab, activeSubService]);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      <h1 className="text-3xl font-bold mb-6">Operations Control</h1>
      
      {/* Tabs & Filters */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("nimc")} className={`px-6 py-2 rounded-xl font-bold ${activeTab === "nimc" ? "bg-black text-white" : "bg-gray-100"}`}>NIMC</button>
        <button onClick={() => setActiveTab("cac")} className={`px-6 py-2 rounded-xl font-bold ${activeTab === "cac" ? "bg-black text-white" : "bg-gray-100"}`}>CAC</button>
      </div>

      {activeTab === "nimc" && (
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {nimcSubServices.map(s => (
            <button key={s} onClick={() => setActiveSubService(s)} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeSubService === s ? "bg-blue-600 text-white" : "bg-white border"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 mb-6">
        {["pending", "approved", "rejected"].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize ${filter === s ? "bg-blue-100 border-blue-500 border" : "bg-white border"}`}>{s}</button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processed.map(r => (
          <div key={r._id} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col">
            <span className={`self-start px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getServiceColor(r.service)}`}>{r.service}</span>
            <h3 className="font-bold text-sm mt-3 truncate">{r.userId?.email}</h3>
            <div className="mt-auto pt-4 flex gap-2">
              <button onClick={() => setSelected(r)} className="flex-1 bg-gray-100 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Eye size={14}/> View</button>
              {filter === "pending" && (
                <>
                  <button onClick={() => handleStatus(r._id, "approved")} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-xs font-bold">Pass</button>
                  <button onClick={() => handleStatus(r._id, "rejected")} className="flex-1 bg-red-600 text-white py-2 rounded-xl text-xs font-bold">Fail</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-12">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border rounded-xl"><ChevronLeft/></button>
        <span className="font-bold text-sm">Page {page} of {pages}</span>
        <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="p-2 border rounded-xl"><ChevronRight/></button>
      </div>
    </div>
  );
}