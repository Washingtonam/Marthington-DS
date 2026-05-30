import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { 
  ArrowLeft, Mail, Smartphone, User, Fingerprint, FileText,
  AlertCircle, CheckCircle2, Loader2, KeyRound, Wallet, BadgeCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatNaira } from "../../lib/currency";

export default function SelfServiceForm() {
  const navigate = useNavigate();
  const { user, refreshBalance } = useUser();
  const [activeTab, setActiveTab] = useState("email");
  const [pricing, setPricing] = useState({});
  const [loadingPricing, setLoadingPricing] = useState(true);
  
  const [formData, setFormData] = useState({ nin: "", phoneNumber: "", fullName: "", additionalInfo: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data } = await api.get("/api/pricing");
        setPricing(data?.ninServices?.selfService || {});
      } catch (err) { console.error("Error fetching pricing:", err); }
      finally { setLoadingPricing(false); }
    };
    fetchPricing();
  }, []);

  const currentCost = activeTab === "email" ? (pricing?.emailRetrieval || 1500) : (pricing?.deviceUnlink || 2000);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentCost > (user?.walletBalance || 0)) {
      return setErrorMessage("Insufficient wallet balance. Please fund your account.");
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await api.post("/api/nin-services/request", {
        userId: user?.id,
        service: "self-service",
        type: activeTab === "email" ? "emailRetrieval" : "deviceUnlink",
        nin: formData.nin,
        amount: currentCost,
        formData: {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          additionalNotes: formData.additionalInfo
        }
      });

      await refreshBalance();
      setSuccessMessage("Request submitted successfully! Funds have been deducted from your wallet.");
      setFormData({ nin: "", phoneNumber: "", fullName: "", additionalInfo: "" });
      setTimeout(() => navigate("/my-requests"), 2000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-16">
      <button onClick={() => navigate("/nin-services")} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm font-medium transition mb-6">
        <ArrowLeft size={16} /> Back to Services
      </button>

      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 text-white p-8 rounded-[2rem] shadow-xl mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-purple-400">
            <KeyRound size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">NIMC Self-Service Portal</h1>
            <p className="text-white/60">Automated verification and device management.</p>
          </div>
        </div>
      </div>

      <div className="flex max-w-md bg-gray-100 dark:bg-[#111827] p-1.5 rounded-2xl mb-8 border dark:border-gray-800">
        <button onClick={() => setActiveTab("email")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition ${activeTab === "email" ? "bg-purple-600 text-white" : "text-gray-500"}`}>
          <Mail size={15} /> Email Retrieval
        </button>
        <button onClick={() => setActiveTab("unlink")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition ${activeTab === "unlink" ? "bg-purple-600 text-white" : "text-gray-500"}`}>
          <Smartphone size={15} /> Device Unlink
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] border dark:border-gray-800 rounded-[2rem] shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <input name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Full Name" className="w-full bg-gray-50 dark:bg-[#0B1120] border rounded-xl p-4 text-sm dark:text-white" required />
            <div className="grid md:grid-cols-2 gap-5">
              <input name="nin" value={formData.nin} onChange={handleInputChange} maxLength={11} placeholder="11-digit NIN" className="w-full bg-gray-50 dark:bg-[#0B1120] border rounded-xl p-4 text-sm dark:text-white" required />
              <input name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="Phone Number" className="w-full bg-gray-50 dark:bg-[#0B1120] border rounded-xl p-4 text-sm dark:text-white" required />
            </div>
            <textarea name="additionalInfo" value={formData.additionalInfo} onChange={handleInputChange} rows={3} placeholder="Additional Notes..." className="w-full bg-gray-50 dark:bg-[#0B1120] border rounded-xl p-4 text-sm dark:text-white" />
            
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><BadgeCheck size={18} /> Confirm & Pay from Wallet</>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#111827] border dark:border-gray-800 rounded-[2rem] shadow-sm p-8">
            <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-white"><Wallet className="text-purple-500" /> Wallet Deduction</h3>
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-6 rounded-2xl text-center">
              <p className="text-xs opacity-80 uppercase">Service Fee</p>
              <h2 className="text-4xl font-black">{formatNaira(currentCost)}</h2>
            </div>
            <p className="text-[11px] text-gray-500 mt-4 text-center">Your balance will be deducted immediately upon submission.</p>
          </div>
        </div>
      </div>
    </div>
  );
}