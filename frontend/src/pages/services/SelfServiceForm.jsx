import { useState, useEffect, useRef } from "react";
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
  KeyRound,
  UploadCloud,
  Copy,
  Check,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function SelfServiceForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
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
  
  // File Upload State
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  
  // Copy Clipboard State
  const [copied, setCopied] = useState(false);
  
  // Status States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Bank Transfer Credentials
  const bankDetails = {
    bankName: "OPAY",
    accountNumber: "6104102697",
    accountName: "WASHINGTON AMEDU"
  };

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

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(bankDetails.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Maximum upload size is 2MB");
        return;
      }
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  // =========================
  // SUBMIT REQUEST TO BACKEND
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!receiptFile) {
      setErrorMessage("Please upload your payment transfer receipt snapshot to proceed.");
      return;
    }

    setIsSubmitting(true);

    // Constructing Multipart Form Data Payload for Images & Fields
    const dataPayload = new FormData();
    dataPayload.append("serviceType", "Self-Service");
    dataPayload.append("subService", activeTab === "email" ? "Email Retrieval" : "Device Unlink");
    dataPayload.append("cost", currentCost);
    dataPayload.append("paymentMethod", "Manual Bank Transfer");
    dataPayload.append("nin", formData.nin);
    dataPayload.append("phoneNumber", formData.phoneNumber);
    dataPayload.append("fullName", formData.fullName);
    dataPayload.append("additionalNotes", formData.additionalInfo);
    dataPayload.append("receipt", receiptFile);

    try {
      const token = localStorage.getItem("token"); 
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
          // Note: Content-Type header must be omitted when sending FormData so browsers parse custom boundary boundaries perfectly
        },
        body: dataPayload
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit request parameters.");
      }

      setSuccessMessage(`Success! Your ${activeTab === "email" ? "Email Retrieval" : "Device Unlink"} execution logs and transaction receipt have been forwarded. Admin will confirm the transfer manually.`);
      
      // Reset input form & receipt preview states
      setFormData({ nin: "", phoneNumber: "", fullName: "", additionalInfo: "" });
      setReceiptFile(null);
      setReceiptPreview("");
    } catch (err) {
      setErrorMessage(err.message || "An unexpected infrastructure error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-16">
      
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
              Direct verification parameter overrides fueled by direct ledger settlements
            </p>
          </div>
        </div>
      </div>

      {/* SERVICE SEGMENT TAB BAR */}
      <div className="flex max-w-md bg-gray-100 dark:bg-[#111827] p-1.5 rounded-2xl mb-8 border border-gray-200/50 dark:border-gray-800/40">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CORE INPUT FIELD LOGISTICS (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-xl p-6 md:p-8">
          <h3 className="text-sm font-bold mb-6 text-gray-800 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
            Subscriber Data Profile
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Subscriber's Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400"><User size={18} /></span>
                <input 
                  type="text" required name="fullName" value={formData.fullName} onChange={handleInputChange}
                  placeholder="Enter citizen's verified identity name"
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

            {/* INTEGRATED MANUAL BANK TRANSFER SLATE */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Upload Payment Proof
              </label>
              
              <input 
                type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden"
              />

              {!receiptPreview ? (
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-8 text-center cursor-pointer transition bg-gray-50/50 dark:bg-[#0B1120]/30"
                >
                  <UploadCloud size={32} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload transfer screenshot</p>
                  <p className="text-xs text-gray-400 mt-1">Maximum file size payload limits: 2MB</p>
                </div>
              ) : (
                <div className="relative border border-gray-200 dark:border-gray-800 rounded-2xl p-3 bg-gray-50 dark:bg-[#0B1120]">
                  <img 
                    src={receiptPreview} alt="Receipt Preview" className="max-h-48 rounded-xl object-contain mx-auto"
                  />
                  <button
                    type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(""); }}
                    className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-1.5 text-xs font-bold shadow-md hover:bg-red-700 transition"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit" disabled={isSubmitting || loadingPricing}
              className="w-full bg-gradient-to-r from-purple-700 to-indigo-900 hover:opacity-95 text-white font-semibold py-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Transmitting Payment and Verification Records...
                </>
              ) : (
                "Submit Request For Manual Approval"
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: BANK DISPATCH CREDENTIALS & PRICE LOOKUP (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* DIGITAL INVOICE METRICS SUMMARY CARD */}
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-xl p-6">
            <h3 className="text-sm font-bold mb-4 dark:text-white">Settlement Breakdowns</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-[#0B1120] rounded-xl p-3 text-xs">
                <span className="text-gray-500">Active Pipeline</span>
                <span className="font-semibold text-purple-500">{activeTab === "email" ? "Email Retrieval" : "Device Unlink"}</span>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Required Settlement Sum</p>
                <h4 className="text-3xl font-black text-blue-700 dark:text-blue-400">
                  {loadingPricing ? "Loading..." : `₦${currentCost.toLocaleString()}`}
                </h4>
              </div>
            </div>
          </div>

          {/* BANK CREDENTIALS BOARD MODULE */}
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
            
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
              <CreditCard size={16} className="text-purple-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Manual Transfer Accounts
              </h4>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase text-white/50 tracking-wider">Bank Name</p>
                <p className="text-sm font-bold tracking-wide">{bankDetails.bankName}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase text-white/50 tracking-wider">Account Number</p>
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 mt-1">
                  <span className="text-lg font-mono font-bold tracking-widest text-yellow-400">
                    {bankDetails.accountNumber}
                  </span>
                  <button 
                    onClick={handleCopyAccount}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white/80"
                    type="button"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase text-white/50 tracking-wider">Account Name</p>
                <p className="text-sm font-bold text-white/90 uppercase">{bankDetails.accountName}</p>
              </div>
            </div>
          </div>

          {/* SYSTEM GUIDELINE ADVISORIES */}
          <div className="bg-gray-50 dark:bg-[#111827] border border-transparent dark:border-gray-800 rounded-[2rem] p-6 text-[11px] text-gray-500 dark:text-gray-400 space-y-3 leading-relaxed">
            <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1 text-xs">
              <AlertCircle size={14} className="text-purple-500" />
              Operational Protocols
            </h4>
            <p>• Payments are checked and reconciled by management manually before requests are authorized into processing execution.</p>
            <p>• Ensure your transfer confirmation screens perfectly show transmission timestamp elements clearly for fast validation updates.</p>
            <p>• Processed applications will immediately emerge inside the global Request Section matrices seamlessly for resolution tracking.</p>
          </div>
        </div>

      </div>
    </div>
  );
}