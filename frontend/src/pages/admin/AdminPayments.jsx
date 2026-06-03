import { useEffect, useState } from "react";
import axios from "axios";
import {
  Wallet,
  CheckCircle2,
  Clock3,
  Eye,
  BadgeDollarSign,
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [unitPrice, setUnitPrice] = useState(215);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const user = JSON.parse(localStorage.getItem("user"));
  const headers = {
    email: user?.email,
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`
  };

  // =========================
  // FETCH PAYMENTS
  // =========================
  const fetchPayments = async () => {
    try {
      setLoading(true);
      // Pointing to the new MVC finance route
      const res = await axios.get(`${API_BASE}/api/finance/payments`, { headers });
      
      const dataArray = Array.isArray(res.data) ? res.data : [];
      
      const filteredData = filter === "all" 
        ? dataArray 
        : dataArray.filter(p => p.status === filter);

      setPayments(filteredData);
    } catch (err) {
      console.error("FETCH ERROR:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FETCH PRICING
  // =========================
  const fetchPricing = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/pricing`);
      setUnitPrice(res.data?.nin?.unitPrice || 215);
    } catch (err) {
      console.error("PRICING ERROR:", err);
    }
  };

  // Manual approve/reject removed — admin panel is now a read-only ledger for automated payments.

  useEffect(() => {
    fetchPayments();
  }, [page, filter]);

  useEffect(() => {
    fetchPricing();
  }, []);

  const statusStyle = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "approved": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const pendingCount = payments.filter(p => p.status === "pending").length;
  const approvedCount = payments.filter(p => p.status === "approved").length;
  const totalAmount = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const startIndex = (page - 1) * LIMIT;
  const paginatedPayments = payments.slice(startIndex, startIndex + LIMIT);
  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <h1 className="text-3xl font-bold mb-3">Payment Requests</h1>
        <p className="text-blue-100">Review wallet funding requests.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <MetricCard title="Pending" value={pendingCount} icon={<Clock3 className="text-yellow-700" />} bgColor="bg-yellow-100" />
        <MetricCard title="Approved" value={approvedCount} icon={<CheckCircle2 className="text-green-700" />} bgColor="bg-green-100" />
        <MetricCard title="Total Volume" value={`₦${totalAmount.toLocaleString()}`} icon={<BadgeDollarSign className="text-blue-700" />} bgColor="bg-blue-100" />
      </div>

      <div className="flex gap-3 flex-wrap mb-8">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`px-5 py-3 rounded-2xl text-sm font-semibold ${filter === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200"}`}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-10 text-gray-500">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedPayments.map((p) => (
            <PaymentCard key={p._id} p={p} statusStyle={statusStyle} setPreview={setPreview} />
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex justify-center items-center p-4">
          <button onClick={() => setPreview(null)} className="absolute top-5 right-5 bg-red-600 text-white px-6 py-2 rounded-2xl">Close</button>
          <img src={preview} alt="Proof" className="max-h-[80vh] rounded-3xl" />
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, bgColor }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 flex items-center justify-between">
      <div><p className="text-sm text-gray-500">{title}</p><h2 className="text-4xl font-bold">{value}</h2></div>
      <div className={`${bgColor} p-4 rounded-2xl`}>{icon}</div>
    </div>
  );
}

function PaymentCard({ p, statusStyle, setPreview }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
        <span className={`text-xs px-3 py-1 rounded-full ${statusStyle(p.status)}`}>{p.status.toUpperCase()}</span>
        <h2 className="font-semibold text-sm mt-2">{p.userId?.email || "Unknown"}</h2>
      </div>
      <div className="p-5">
        <div className="flex justify-between border-b pb-2">
            <span className="text-sm text-gray-500">Amount</span>
            <span className="font-bold">₦{p.amount?.toLocaleString()}</span>
        </div>
      </div>
      {p.status === "pending" && p.reference && String(p.reference).startsWith("PAY_") && (
        <div className="p-5 pt-0">
          <p className="text-sm text-gray-600">This payment was initiated via Paystack and is processed automatically. No manual approval required.</p>
        </div>
      )}
    </div>
  );
}

