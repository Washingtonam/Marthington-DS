import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  BadgeCheck,
  ArrowRight,
  FileCheck,
  RefreshCcw,
  Fingerprint,
  Loader2,
  SearchCode, // Icon element wrapper import mapping helper
} from "lucide-react";
import { motion } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function NINServices() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // FETCH PRICING ENGINE MAPPINGS
  // =========================
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/pricing`);
        setPricing(res.data);
      } catch (err) {
        console.error("Pricing fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPricing();
  }, []);

  const ServiceCard = ({ title, description, color, icon, pricingItems, buttonText, route }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="relative overflow-hidden bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-7 flex flex-col justify-between"
    >
      <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10 ${color}`} />
      <div>
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-white ${color}`}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold mb-3 dark:text-white">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">{description}</p>
        
        <div className="space-y-3 mb-7">
          {pricingItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-[#0B1120] rounded-2xl px-4 py-3">
              <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
              <span className="font-bold text-sm dark:text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate(route)}
        className="w-full bg-gradient-to-r from-slate-900 to-blue-900 hover:opacity-90 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition"
      >
        {buttonText}
        <ArrowRight size={18} />
      </button>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 font-medium">
          <Loader2 className="animate-spin" />
          Loading services catalog...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pt-4">
      {/* HERO LAYER */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-10"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center">
              <ShieldCheck size={34} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black">NIN Services</h1>
              <p className="text-white/70 mt-2">Fast, secure and professional identity processing platform</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-5">
              <p className="text-sm text-white/70">Secure Processing</p>
              <h3 className="text-2xl font-bold mt-1">100%</h3>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-5">
              <p className="text-sm text-white/70">Service Availability</p>
              <h3 className="text-2xl font-bold mt-1">24/7</h3>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-5">
              <p className="text-sm text-white/70">Trusted Platform</p>
              <h3 className="text-2xl font-bold mt-1">Verified</h3>
            </div>
          </div>
        </div>
      </motion.div>

      {/* THREE TIER APP SERVICES GRID SELECTIONS */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* VALIDATION BLOCK */}
        <ServiceCard
          title="Validation"
          description="Validate NIN records instantly using advanced verification methods and official identity confirmation."
          color="bg-blue-500"
          icon={<FileCheck size={32} />}
          pricingItems={[
            { label: "No Record", value: `₦${pricing?.ninServices?.validation?.noRecord || 1000}` },
            { label: "Update Record", value: `₦${pricing?.ninServices?.validation?.updateRecord || 1150}` },
            { label: "Modification", value: `₦${pricing?.ninServices?.validation?.validateModification || 1150}` },
            { label: "VNIN Extraction", value: `₦${pricing?.ninServices?.validation?.vnin || 1000}` },
          ]}
          buttonText="Start Validation"
          route="/nin-services/validation"
        />

        {/* IPE BLOCK */}
        <ServiceCard
          title="IPE Clearance"
          description="Resolve enrollment processing issues, tracking problems and identity processing delays quickly."
          color="bg-indigo-500"
          icon={<RefreshCcw size={32} />}
          pricingItems={[
            { label: "Processing Error", value: `₦${pricing?.ninServices?.ipe?.inProcessingError || 1000}` },
            { label: "Still Processing", value: `₦${pricing?.ninServices?.ipe?.stillProcessing || 1000}` },
            { label: "New Enrollment", value: `₦${pricing?.ninServices?.ipe?.newEnrollment || 1000}` },
            { label: "Invalid Tracking", value: `₦${pricing?.ninServices?.ipe?.invalidTracking || 1000}` },
          ]}
          buttonText="Start Clearance"
          route="/nin-services/ipe-clearance"
        />

        {/* MODIFICATION & TRACKING SEARCH UNIFIED ENGINE CARD */}
        <ServiceCard
          title="Modification & Tracking"
          description="Submit requests for NIN corrections or trace profile generations directly using valid enrollment parameters."
          color="bg-emerald-500"
          icon={<Fingerprint size={32} />}
          pricingItems={[
            { label: "Data Corrections", value: "Available" },
            { label: "Biometric Re-entry", value: "Available" },
            { label: "Tracking Search Rate", value: `₦${pricing?.ninServices?.ipe?.invalidTracking || 1000}` }, // Links dynamically to live configuration
            { label: "NIMC Field Updates", value: "Active" },
          ]}
          buttonText="Open Service Module"
          route="/nin-services/modification"
        />
      </div>

      {/* CONDITIONAL SLIP PRICING STRIP */}
      {pricing?.ninServices?.slipPrice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-[2rem] shadow-2xl"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/70 text-sm mb-1">Slip Generation Fee</p>
              <h3 className="text-3xl font-black">₦{pricing.ninServices.slipPrice}</h3>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
              <p className="text-sm">Premium downloadable slips available</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* SECURITY AND BEST PRACTICES COMPLIANCE FOOTER DISCLAIMER CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-8 mb-16"
      >
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center shrink-0">
            <BadgeCheck size={30} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3 dark:text-white">Secure & Trusted Processing</h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl text-sm">
              All NIN services are processed securely with enterprise-grade infrastructure, encrypted submissions 
              and professional handling. Ensure proper authorization is cleared before uploading data indices to tracking queries.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}