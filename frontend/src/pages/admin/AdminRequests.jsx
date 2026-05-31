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

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/requests?page=${page}&limit=12&status=${activeStatus}`, {
        headers: { email: localStorage.getItem("email") || "" }
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

const handleStatusUpdate = async (id, status) => {
    if (!id) return;
    if (!window.confirm(`Confirm ${status} for this record?`)) return;

    try {
      // TRY THIS PATH FIRST (Removing the '/admin' middle segment)
      // Sometimes routes are defined as /api/update-status/:id
      const res = await axios.put(
        `${API_BASE}/api/update-status/${id}`, 
        { status }, 
        { headers: { email: localStorage.getItem("email") || "" } }
      );
      
      console.log("Update success:", res.data);
      fetchRequests(); 
    } catch (err) {
      // IF THAT FAILS, TRY THIS PATH (The original one but without the extra /admin)
      // Maybe the route is /api/admin/status/:id
      console.error("Path 1 failed, trying alternative...");
      try {
          await axios.put(`${API_BASE}/api/admin/status/${id}`, { status }, { 
              headers: { email: localStorage.getItem("email") || "" } 
          });
          fetchRequests();
      } catch (err2) {
          alert("404 Error: The API endpoint is not found. Please verify your backend route definition.");
      }
    }
  };

  const displayedRequests = useMemo(() => {
    let filtered = requests.filter(r => {
      const isCac = r.service?.toLowerCase() === "cac";
      if (activeTab === "cac") return isCac;
      return !isCac && (activeSubService === "All" || r.service?.toLowerCase() === activeSubService.toLowerCase());
    });

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.userId?.email?.toLowerCase().includes(s) || r.nin?.toLowerCase().includes(s));
    }

    return filtered.sort((a, b) => sortOrder === "desc" ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt));
  }, [requests, activeTab, activeSubService, searchTerm, sortOrder]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header & Main Toggles */}
      <div className="flex gap-4 mb-6">
        {["nimc", "cac"].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setActiveSubService("All"); }} className={`px-6 py-3 font-bold rounded-2xl ${activeTab === tab ? "bg-black text-white" : "bg-gray-100"}`}>
            {tab.toUpperCase()} Services
          </button>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6">
        {["pending", "approved", "rejected"].map(s => (
          <button key={s} onClick={() => { setActiveStatus(s); setPage(1); }} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${activeStatus === s ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* NIMC Sub-Services */}
      {activeTab === "nimc" && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {nimcSubServices.map(s => (
            <button key={s} onClick={() => setActiveSubService(s)} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeSubService === s ? "bg-gray-800 text-white" : "bg-white border"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {displayedRequests.map(r => (
          <div key={r._id} className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-sm truncate">{r.userId?.email}</h3>
            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${serviceColors[r.service] || "bg-gray-100"}`}>
              {r.service || "General"}
            </span>
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

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-10">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 bg-gray-100 rounded-xl"><ChevronLeft /></button>
        <span className="font-bold">Page {page} of {pages}</span>
        <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="p-2 bg-gray-100 rounded-xl"><ChevronRight /></button>
      </div>
    </div>
  );
}