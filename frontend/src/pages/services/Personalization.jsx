import { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  Binary,
  ArrowLeft,
  Search,
  Loader2,
  Wallet,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function Personalization() {
  const navigate = useNavigate();
  const { user, units, setUnits } = useUser();

  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [ apiingPrice, setApiingPrice] = useState(true);
  
  // Dynamic Pricing State (Will read from your database engine settings)
  const [trackingCost, setTrackingCost] = useState(1000);
  const [unitPrice, setUnitPrice] = useState(215);

  // ==========================================
  // 📥  api LIVE CONFIGURATION PRICING
  // ==========================================
  useEffect(() => {
    const apiLiveRate = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/pricing`);
        const data = res.data;
        
        if (data?.nin?.unitPrice) setUnitPrice(data.nin.unitPrice);
        
        // Maps straight to your admin pricing IPE key property
        if (data?.ninServices?.ipe?.invalidTracking) {
          setTrackingCost(data.ninServices.ipe.invalidTracking);
        }
      } catch (err) {
        console.error("Failed to load live tracking rates:", err);
      } finally {
        setApiingPrice(false);
      }
    };
     apiLiveRate();
  }, []);

  // Calculate equivalent wallet units required to clear the cost
  const tokensRequired = Math.ceil(trackingCost / unitPrice);

  // ==========================================
  // 🚀 PROCESS TRACKING SEARCH SUBMISSION
  // ==========================================
  const handleTrackingSearch = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!trackingId.trim()) {
      return alert("Please enter a valid Tracking ID");
    }

    const isAdmin = user?.email?.toLowerCase().trim() === "washingtonamedu@gmail.com";

    // Enforce safety wallet balance validation metrics
    if (!isAdmin && units < tokensRequired) {
      return alert(
        `Insufficient wallet balance. You need ${tokensRequired} units (₦${trackingCost.toLocaleString()}) to process this personalization query.`
      );
    }

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await  api(`${API_BASE}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id || user._id,
          method: "tracking",
          tracking_id: trackingId.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res;

      if (!res.ok) {
        throw new Error(data.error || data.message || "Tracking lookup failed");
      }

      // Sync updated units balance context track
      if (data.units !== undefined) setUnits(data.units);

      localStorage.setItem("nin_result", JSON.stringify(data));
      navigate("/verify-result");
    } catch (err) {
      console.error(err);
      if (err.name === "AbortError") {
        alert("⏳ Request timeout. The registry server took too long to respond.");
      } else {
        alert(err.message || "An operational failure occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 pt-4 pb-16">
      
      {/* BACK NAVIGATION LINK ACTION */}
      <button
        onClick={() => navigate("/nin-services")}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition mb-6"
      >
        <ArrowLeft size={16} />
        Back to NIN Services
      </button>

      {/* HERO SECTION BLOCK CONTAINER */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-900 text-white p-8 shadow-2xl mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
              <Binary size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Personalization</h1>
              <p className="text-white/70 text-xs mt-1">Trace profile generation states using raw enrollment identifiers</p>
            </div>
          </div>

          <div className="bg-white/10 border border-white/10 backdrop-blur rounded-2xl p-4 min-w-[200px] text-right md:text-left flex md:flex-col justify-between items-center md:items-start">
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-wider">Your Balance</p>
              <h2 className="text-2xl font-bold mt-0.5">{units} Units</h2>
            </div>
            <div className="md:mt-2 text-xs text-yellow-400 font-semibold bg-black/20 px-2.5 py-1 rounded-lg">
              { apiingPrice ? "Syncing Rate..." : `Cost: ${tokensRequired} Units`}
            </div>
          </div>
        </div>
      </div>

      {/* CORE OPERATIONAL DATA FORM CONTROL SHEET */}
      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
        <form onSubmit={handleTrackingSearch} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">
              Enrollment Tracking ID
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Provide the tracking string located on the top margin boundary context slip.
            </p>
            <div className="relative">
              <Search size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                required
                type="text"
                placeholder="e.g. R-12345678-ABCD-EFGH"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium tracking-wide uppercase"
              />
            </div>
          </div>

          {/* DYNAMIC PRICE VALUE CHARGE FOOTER ALERT BANNER */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
              Submitting this tracing payload will deduct **{tokensRequired} wallet tokens** (equivalent to ₦{trackingCost.toLocaleString()}) from your available ledger profile pool state balance instantly on execution response confirmation.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading ||  apiingPrice}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />  apiing Registry Records...
              </>
            ) : (
              <>
                Execute Personalization Search (₦{trackingCost.toLocaleString()})
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}