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
  Binary, 
  KeyRound, // Added for the new Selfservice card module
} from "lucide-react";
import { motion } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function NINServices() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // api PRICING
  // =========================
  useEffect(() => {
    const apiPricing = async () => {
      try {
        const res = await api(`${API_BASE}/api/pricing`);
        const data = await res;
        setPricing(data);
      } catch (err) {
        console.error("Pricing error:", err);
      }
      setLoading(false);
    };

     apiPricing();
  }, []);

  // =========================
  // CARD COMPONENT
  // =========================
  const ServiceCard = ({
    title,
    description,
    color,
    icon,
    pricingItems,
    buttonText,
    route,
  }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="relative overflow-hidden bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col justify-between h-full"
    >
      {/* GLOW EFFECT BACKGROUND */}
      <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10 ${color}`} />

      <div>
        {/* ICON CONTAINER */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-white ${color}`}>
          {icon}
        </div>

        {/* TITLE */}
        <h2 className="text-xl font-bold mb-2 dark:text-white">
          {title}
        </h2>

        {/* DESCRIPTION */}
        <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-5 min-h-[40px]">
          {description}
        </p>

        {/* PRICING ITEMS LIST PANEL */}
        <div className="space-y-2 mb-6">
          {pricingItems.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center bg-gray-50 dark:bg-[#0B1120] rounded-xl px-3.5 py-2.5"
            >
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {item.label}
              </span>
              <span className="font-bold text-xs dark:text-white">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ACTION BUTTON TO SUBMIT MODULE */}
      <button
        onClick={() => navigate(route)}
        className="w-full bg-gradient-to-r from-slate-900 to-blue-900 hover:opacity-90 text-white py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm mt-auto"
      >
        {buttonText}
        <ArrowRight size={16} />
      </button>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 font-medium text-sm">
          <Loader2 className="animate-spin" size={18} />
          Loading platform service options...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-1 pt-4">

      {/* ========================= */}
      {/* HERO REGISTRATION BOARD BANNER */}
      {/* ========================= */}
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
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                NIN Services
              </h1>
              <p className="text-white/70 mt-2 text-sm md:text-base">
                Fast, secure and professional identity processing infrastructure platform
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8 max-w-3xl">
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-4 text-center md:text-left">
              <p className="text-xs text-white/60">Secure Infrastructure</p>
              <h3 className="text-xl md:text-2xl font-bold mt-0.5">100% Verified</h3>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-4 text-center md:text-left">
              <p className="text-xs text-white/60">System Availability</p>
              <h3 className="text-xl md:text-2xl font-bold mt-0.5">24/7 Active</h3>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-4 text-center md:text-left">
              <p className="text-xs text-white/60">Registry Sync Speed</p>
              <h3 className="text-xl md:text-2xl font-bold mt-0.5">Instant</h3>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========================= */}
      {/* 🚀 UPGRADED 3-4 VARIABLE LOGICAL GRID */}
      {/* ========================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">

        {/* SERVICE LAYER 1: VALIDATION SYSTEM */}
        <ServiceCard
          title="Validation"
          description="Validate NIN records instantly using advanced verification methods and official registry syncs."
          color="bg-blue-500 hover:bg-blue-600"
          icon={<FileCheck size={28} />}
          pricingItems={[
            { label: "No Record Found", value: `₦${(pricing?.ninServices?.validation?.noRecord || 1000).toLocaleString()}` },
            { label: "Update Record Data", value: `₦${(pricing?.ninServices?.validation?.updateRecord || 1150).toLocaleString()}` },
            { label: "Modification Verify", value: `₦${(pricing?.ninServices?.validation?.validateModification || 1150).toLocaleString()}` },
            { label: "Virtual NIN (VNIN)", value: `₦${(pricing?.ninServices?.validation?.vnin || 1000).toLocaleString()}` },
          ]}
          buttonText="Start Validation"
          route="/nin-services/validation"
        />

        {/* SERVICE LAYER 2: IPE CLEARANCE SYSTEMS */}
        <ServiceCard
          title="IPE Clearance"
          description="Resolve database processing exceptions, tracking hangs, and identity clearance roadblocks."
          color="bg-indigo-500 hover:bg-indigo-600"
          icon={<RefreshCcw size={28} />}
          pricingItems={[
            { label: "In-Processing Error", value: `₦${(pricing?.ninServices?.ipe?.inProcessingError || 1000).toLocaleString()}` },
            { label: "Still Processing Flag", value: `₦${(pricing?.ninServices?.ipe?.stillProcessing || 1000).toLocaleString()}` },
            { label: "New Enrollment Lock", value: `₦${(pricing?.ninServices?.ipe?.newEnrollment || 1000).toLocaleString()}` },
            { label: "Invalid Tracking Code", value: `₦${(pricing?.ninServices?.ipe?.invalidTracking || 1000).toLocaleString()}` },
          ]}
          buttonText="Start Clearance"
          route="/nin-services/ipe-clearance"
        />

        {/* SERVICE LAYER 3: MODIFICATIONS PANEL */}
        <ServiceCard
          title="Modification"
          description="Submit secure pipelines for data property corrections and registry field updates."
          color="bg-emerald-500 hover:bg-emerald-600"
          icon={<Fingerprint size={28} />}
          pricingItems={[
            { label: "Name Corrections", value: `₦${(pricing?.ninServices?.modification?.name || 12000).toLocaleString()}` },
            { label: "Date of Birth (DoB)", value: `₦${(pricing?.ninServices?.modification?.dob || 50000).toLocaleString()}` },
            { label: "Address Re-mapping", value: `₦${(pricing?.ninServices?.modification?.address || 12000).toLocaleString()}` },
            { label: "Phone Synchronization", value: `₦${(pricing?.ninServices?.modification?.phone || 12000).toLocaleString()}` },
          ]}
          buttonText="Start Modification"
          route="/nin-services/modification"
        />

        {/* SERVICE LAYER 4: PERSONALIZATION */}
        <ServiceCard
          title="Personalization"
          description="Trace and extract full identity record structures using raw system data enrollment tracking identifiers."
          color="bg-amber-500 hover:bg-amber-600"
          icon={<Binary size={28} />}
          pricingItems={[
            { label: "Tracking Lookup Base", value: `₦${(pricing?.ninServices?.ipe?.invalidTracking || 1000).toLocaleString()}` },
            { label: "Record Extraction", value: "Included" },
            { label: "Data Index Profile", value: "Verified" },
            { label: "Database State Pull", value: "Live" },
          ]}
          buttonText="Start Tracking"
          route="/nin-services/personalization" 
        />

        {/* 🔥 NEW SERVICE LAYER 5: SELFSERVICE MODULE */}
        <ServiceCard
          title="Selfservice"
          description="Execute direct NIMC self-service actions, linkage overrides, and active credential extractions."
          color="bg-purple-500 hover:bg-purple-600"
          icon={<KeyRound size={28} />}
          pricingItems={[
            { label: "Email Retrieval", value: `₦${(pricing?.ninServices?.selfService?.emailRetrieval || 1500).toLocaleString()}` },
            { label: "Device Unlink Portal", value: `₦${(pricing?.ninServices?.selfService?.deviceUnlink || 2000).toLocaleString()}` },
            { label: "Session Reset Override", value: "Instant" },
            { label: "Sync Security Key", value: "Automated" },
          ]}
          buttonText="Access Selfservice"
          route="/nin-services/selfservice" 
        />

      </div>

      {/* ========================= */}
      {/* SYSTEM FEE FOOTER SLIP STRIP */}
      {/* ========================= */}
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
              <p className="text-sm">Premium downloadable slips available instantly</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================= */}
      {/* COMPLIANCE FOOTER CARD */}
      {/* ========================= */}
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
            <h2 className="text-2xl font-bold mb-3 dark:text-white">Secure & Trusted Infrastructure</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-4xl">
              All identity operations are executed securely using corporate API nodes, encrypted logs, and automated clearing networks. Ensure clear compliance parameters before testing records.
            </p>
          </div>
        </div>
      </motion.div>

    </div>
  );
}