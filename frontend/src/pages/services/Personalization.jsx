import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { Binary, ArrowLeft, Search, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function Personalization() {
  const navigate = useNavigate();
  const { user, units, setUnits } = useUser();

  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(true);
  const [trackingCost, setTrackingCost] = useState(1000);
  const [unitPrice, setUnitPrice] = useState(215);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data } = await api.get("/api/pricing");
        if (data?.nin?.unitPrice) setUnitPrice(data.nin.unitPrice);
        if (data?.ninServices?.ipe?.invalidTracking) setTrackingCost(data.ninServices.ipe.invalidTracking);
      } catch (err) {
        console.error("Pricing fetch error:", err);
      } finally {
        setIsPricingLoading(false);
      }
    };
    fetchPricing();
  }, []);

  const tokensRequired = Math.ceil(trackingCost / unitPrice);

  const handleTrackingSearch = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!trackingId.trim()) return alert("Please enter a valid Tracking ID");

    const isAdmin = user?.email?.toLowerCase().trim() === import.meta.env.VITE_SUPER_ADMIN_EMAIL;
    if (!isAdmin && units < tokensRequired) {
      return alert(`Insufficient balance. You need ${tokensRequired} units (₦${trackingCost.toLocaleString()}).`);
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/services/verify", {
        userId: user.id || user._id,
        method: "tracking",
        tracking_id: trackingId.trim().toUpperCase(),
      });

      if (data.units !== undefined) setUnits(data.units);
      localStorage.setItem("nin_result", JSON.stringify(data));
      navigate("/verify-result");
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed. Registry may be unreachable.");
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
            <p className="text-xs opacity-60">BALANCE</p>
            <h2 className="text-2xl font-bold">{units} Units</h2>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl p-8 border">
        <form onSubmit={handleTrackingSearch} className="space-y-6">
          <input 
            required 
            placeholder="e.g. R-12345678-ABCD-EFGH" 
            className="w-full bg-gray-50 dark:bg-[#0B1120] border rounded-2xl p-4 pl-12 uppercase"
            value={trackingId} 
            onChange={(e) => setTrackingId(e.target.value)} 
          />
          <button disabled={loading || isPricingLoading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : `Search Records (₦${trackingCost.toLocaleString()})`}
          </button>
        </form>
      </div>
    </div>
  );
}