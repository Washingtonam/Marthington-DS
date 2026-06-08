import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { ArrowLeft, Loader2, Search, Wallet } from "lucide-react";
import { formatNaira } from "../../lib/currency";
import { motion } from "framer-motion";

export default function Personalization() {
  const navigate = useNavigate();
  const { user, setBalance } = useUser();

  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data } = await api.get("/api/pricing");
        setCost(data?.ninServices?.validation?.tracking || 1000);
      } catch (err) {
        console.error("Pricing fetch error:", err);
      }
    };
    fetchPricing();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return alert("Please enter a valid Tracking ID");
    
    // Wallet-First Validation
    if (cost > (user?.walletBalance || 0)) {
      return alert("Insufficient wallet balance. Please fund your wallet.");
    }

    setLoading(true);
    try {
      const response = await api.post("/api/services/verify", {
        method: "tracking",
        tracking_id: trackingId.trim().toUpperCase(),
        consent: true,
      });

      // Instantly update wallet from API response (no extra fetch needed)
      if (response.data?.walletBalance !== undefined) {
        setBalance(response.data.walletBalance);
      }
      localStorage.setItem("nin_result", JSON.stringify(response.data));
      navigate(`/verify-result/${response.data.requestId || ""}`);
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate("/nin-services")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6">
        <ArrowLeft size={16} /> Back to Services
      </button>

      <div className="bg-gradient-to-r from-slate-950 to-indigo-900 text-white p-8 rounded-[2rem] shadow-2xl mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black">Personalization</h1>
            <p className="text-white/70 text-sm">Trace profile states using raw identifiers</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-60">WALLET BALANCE</p>
            <h2 className="text-2xl font-bold">{formatNaira(user?.walletBalance || 0)}</h2>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl p-8 border">
        <form onSubmit={handleSearch} className="space-y-6">
          <input 
            required 
            placeholder="e.g. R-12345678-ABCD-EFGH" 
            className="w-full bg-gray-50 dark:bg-[#0B1120] border rounded-2xl p-4 uppercase dark:text-white"
            value={trackingId} 
            onChange={(e) => setTrackingId(e.target.value)} 
          />
          <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <>Search Records ({formatNaira(cost)})</>}
          </button>
        </form>
      </div>
    </div>
  );
}