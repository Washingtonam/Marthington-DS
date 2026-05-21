import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Mail, 
  Smartphone, 
  User, 
  Fingerprint, 
  FileText,
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  KeyRound
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function SelfServiceForm() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("email"); // "email" or "unlink"
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
    nin: "",
    phoneNumber: "",
    fullName: "",
    additionalInfo: ""
  });
  
  // Status States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // =========================
  // FETCH PRICING DATA
  // =========================
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pricing`);
        const data = await res.json();
        setPricing(data);
      } catch (err) {
        console.error("Error fetching pricing:", err);
      }
      setLoadingPricing(false);
    };
    fetchPricing();
  }, []);

  // Get current active cost based on tab selection
  const currentCost = activeTab === "email" 
    ? (pricing?.ninServices?.selfService?.emailRetrieval || 1500)
    : (pricing?.ninServices?.selfService?.deviceUnlink || 2000);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // =========================
  // SUBMIT REQUEST TO BACKEND
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    // Form payload construction
    const payload = {
      serviceType: "Self-Service",
      subService: activeTab === "email" ? "Email Retrieval" : "Device Unlink",
      cost: currentCost,
      details: {
        nin: formData.nin,
        phoneNumber: formData.phoneNumber,
        fullName: formData.fullName,
        additionalNotes: formData.additionalInfo
      }
    };

    try {
      const token = localStorage.getItem("token"); // or wherever your authentication token is stored
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit registration request.");
      }

      setSuccessMessage(`Success! Your ${payload.subService} request has been recorded. Admin will process it shortly.`);
      // Reset input form on success
      setFormData({ nin: "", phoneNumber: "", fullName: "", additionalInfo: "" });
    } catch (err) {
      setErrorMessage(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
      
      {/* BACK NAVIGATION */}
      <button 
        onClick={() => navigate("/nin-services")}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-white text-sm font-medium transition mb-6"
      >
        <ArrowLeft size={16} /> Back to NIMC Services
      </button>

      {/* HEADER HERO MODULE */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 text-white p-8 rounded-[2rem] shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-purple-400">
            <KeyRound size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">NIMC Self-Service Portal</h1>
            <p className="text-white/60 text-xs md:text-sm mt-1">
              Direct linkage updates, profile retrievals, and device validation override pipelines
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: INTERACTIVE FORM CONTAINER */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-xl p-6 md:p-8">
          
          {/* SERVICE SEGMENT TAB BAR */}
          <div className="flex bg-gray-50 dark:bg-[#0B1120] p-1.5 rounded-2xl mb-8 border border-gray-100 dark:border-gray-800/40">
            <button
              onClick={() => { setActiveTab("email"); setErrorMessage(""); setSuccessMessage(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition ${
                activeTab === "email" 
                  ? "bg-purple-600 text-white shadow-md" 
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
              }`}
            >
              <Mail size={15} />
              Email Retrieval
            </button>
            <button
              onClick={() => { setActiveTab("unlink"); setErrorMessage(""); setSuccessMessage(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition ${
                activeTab === "unlink" 
                  ? "bg-purple-600 text-white shadow-md" 
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
              }`}
            >
              <Smartphone size={15} />
              Device Unlink
            </button>
          </div>

          {/* GLOBAL FEEDBACK NOTIFICATIONS */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-xs font-medium">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
            {successMessage && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* INPUT DISPATCH FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Subscriber's Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400"><User size={18} /></span>
                <input 
                  type="text" required name="fullName" value={formData.fullName} onChange={handleInputChange}
                  placeholder="Enter citizen's verified structural name"
                  className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-100 dark:border-gray-800 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:text-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">National Identification Number (NIN)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-400"><Fingerprint size={18} /></span>
                  <input 
                    type="text" required maxLength={11} minLength={11} name="nin" value={formData.nin} onChange={handleInputChange}
                    placeholder="11-digit NIN identifier"
                    className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-100 dark:border-gray-800 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:text-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Linked Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-400"><Smartphone size={18} /></span>
                  <input 
                    type="tel" required name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange}
                    placeholder="08000000000"
                    className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-100 dark:border-gray-800 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:text-white transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {activeTab === "email" ? "Additional Tracking Notes (Optional)" : "Target Device / App Lock Details"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400"><FileText size={18} /></span>
                <textarea 
                  name="additionalInfo" rows={3} value={formData.additionalInfo} onChange={handleInputChange}
                  placeholder={activeTab === "email" ? "Provide context parameters if tracking specific registers..." : "Specify phone model or platform profile application details (e.g., NIMC MWS app lockout error)"}
                  className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-100 dark:border-gray-800 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:text-white transition resize-none"
                />
              </div>
            </div>

            <button
              type="submit" disabled={isSubmitting || loadingPricing}
              className="w-full bg-gradient-to-r from-purple-700 to-indigo-900 hover:opacity-95 text-white font-semibold py-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Processing Pipeline Ledger Execution...
                </>
              ) : (
                `Process Request (Deduct ₦${currentCost.toLocaleString()})`
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: PRICING & INSTRUCTIONAL SLATE */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-xl p-6">
            <h3 className="text-sm font-bold mb-4 dark:text-white">Transaction Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-[#0B1120] rounded-xl p-3 text-xs">
                <span className="text-gray-500">Service Category</span>
                <span className="font-semibold dark:text-white">Self-Service Portal</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-[#0B1120] rounded-xl p-3 text-xs">
                <span className="text-gray-500">Active Pipeline</span>
                <span className="font-semibold text-purple-500">{activeTab === "email" ? "Email Retrieval" : "Device Unlink"}</span>
              </div>
              <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/40 rounded-xl p-3.5 text-xs">
                <span className="font-semibold text-purple-700 dark:text-purple-400">Total Deductible Fee</span>
                <span className="font-black text-sm text-purple-700 dark:text-purple-400">
                  {loadingPricing ? "Loading..." : `₦${currentCost.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[#111827] border border-transparent dark:border-gray-800 rounded-[2rem] p-6 text-xs text-gray-500 dark:text-gray-400 space-y-3 leading-relaxed">
            <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1 text-xs">
              <AlertCircle size={14} className="text-purple-500" />
              Operational Protocol
            </h4>
            <p>Ensure the provided 11-digit NIN is perfectly synchronized with NIMC's core engine parameters.</p>
            <p><strong>Device Unlink:</strong> This execution completely resets active mobile workspace application profile pairings, wiping previous application lockouts within 10–30 minutes.</p>
            <p>Processed records will immediately populate your admin execution query grids dynamically.</p>
          </div>
        </div>

      </div>
    </div>
  );
}