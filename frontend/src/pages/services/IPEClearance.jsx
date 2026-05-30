import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatNaira } from "../../lib/currency";

export default function IPEClearance() {
  const navigate = useNavigate();
  const { user, refreshBalance } = useUser();
  const [pricing, setPricing] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [nin, setNin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data } = await api.get("/api/pricing");
        setPricing(data?.ninServices?.ipe || {});
      } catch (err) {
        console.error("Failed to load pricing", err);
      }
    };
    fetchPricing();
  }, []);

  const total = pricing?.[selectedType] || 0;

  const submit = async () => {
    if (!selectedType || nin.length !== 11) return alert("Select a service and enter valid 11-digit NIN.");
    if (total > (user?.walletBalance || 0)) return alert("Insufficient wallet balance.");

    setLoading(true);
    try {
      await api.post("/api/nin-services/request", {
        userId: user?.id,
        service: "ipe",
        type: selectedType,
        nin,
        amount: total,
      });

      await refreshBalance();
      alert("✅ Request submitted and wallet deducted successfully!");
      navigate("/my-requests");
    } catch (err) {
      alert(err.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { key: "inProcessingError", label: "In Processing Error", desc: "Fix records stuck during processing", icon: <AlertCircle size={24} /> },
    { key: "stillProcessing", label: "Still Processing", desc: "Resolve prolonged delays", icon: <ShieldAlert size={24} /> },
    { key: "newEnrollment", label: "New Enrollment", desc: "Tracking ID enrollment issues", icon: <CheckCircle2 size={24} /> },
    { key: "invalidTracking", label: "Invalid Tracking ID", desc: "Correct invalid tracking", icon: <AlertCircle size={24} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white rounded-[2rem] p-10 shadow-2xl mb-8">
        <h1 className="text-4xl font-black mb-2">IPE Clearance</h1>
        <p className="opacity-80">Professional clearance for processing and enrollment errors.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {services.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelectedType(s.key)}
                className={`text-left rounded-3xl border-2 p-6 transition-all ${selectedType === s.key ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-[#111827] border-transparent shadow-sm"}`}
              >
                <div className="text-blue-600 mb-2">{s.icon}</div>
                <h2 className="font-bold text-lg dark:text-white">{s.label}</h2>
                <p className="text-sm text-gray-500 mb-4">{s.desc}</p>
                <p className="font-black text-xl dark:text-white">{formatNaira(pricing?.[s.key] || 0)}</p>
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-[#111827] p-8 rounded-[2rem] shadow-sm border">
            <input 
              className="w-full p-4 rounded-2xl border bg-gray-50 dark:bg-[#0B1120] dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Enter 11-digit NIN" 
              value={nin} 
              onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))} 
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-8 rounded-[2rem] shadow-xl h-fit sticky top-6 border">
          <h3 className="font-bold text-xl mb-6 dark:text-white flex items-center gap-2">
            <Wallet className="text-blue-600" /> Payment Summary
          </h3>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 rounded-2xl mb-6">
            <p className="text-xs opacity-80 uppercase">Total Deduction</p>
            <h2 className="text-4xl font-black">{formatNaira(total)}</h2>
          </div>
          
          <button
            onClick={submit}
            disabled={loading || !selectedType || !nin}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Confirm & Pay from Wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}