import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { 
  ShieldCheck, ArrowRight, FileCheck, RefreshCcw, 
  Fingerprint, Loader2, Binary, KeyRound, BadgeCheck 
} from "lucide-react";
import { motion } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function NINServices() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/pricing`);
        setPricing(res.data || {});
      } catch (err) { console.error("Pricing fetch error:", err); }
      finally { setLoading(false); }
    };
    fetchPricing();
  }, []);

  const ServiceCard = ({ title, description, color, icon, pricingItems, buttonText, route }) => (
    <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-white ${color}`}>
        {icon}
      </div>
      <h2 className="text-xl font-bold mb-2 dark:text-white">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-6 flex-grow">{description}</p>
      
      <div className="space-y-2 mb-6">
        {pricingItems.map((item, i) => (
          <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-[#0B1120] rounded-xl px-3.5 py-2.5">
            <span className="text-xs text-gray-600 dark:text-gray-300">{item.label}</span>
            <span className="font-bold text-xs dark:text-white">{item.value}</span>
          </div>
        ))}
      </div>

      <button onClick={() => navigate(route)} className="w-full bg-slate-900 hover:bg-blue-900 text-white py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition">
        {buttonText} <ArrowRight size={16} />
      </button>
    </motion.div>
  );

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-sm"><Loader2 className="animate-spin mr-2" /> Loading platform...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-slate-950 to-blue-900 text-white p-10 rounded-[2rem] shadow-2xl mb-10">
        <h1 className="text-4xl md:text-5xl font-black mb-4">NIN Services</h1>
        <p className="text-white/70 max-w-lg">Fast, secure, and professional identity processing infrastructure.</p>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ServiceCard 
          title="Validation" icon={<FileCheck size={28} />} color="bg-blue-500" route="/nin-services/validation"
          buttonText="Start Validation"
          pricingItems={[
            { label: "No Record", value: `₦${(pricing?.ninServices?.validation?.noRecord || 1000).toLocaleString()}` },
            { label: "Update Record", value: `₦${(pricing?.ninServices?.validation?.updateRecord || 1150).toLocaleString()}` }
          ]}
          description="Validate NIN records instantly using official registry syncs."
        />
        <ServiceCard 
          title="IPE Clearance" icon={<RefreshCcw size={28} />} color="bg-indigo-500" route="/nin-services/ipe-clearance"
          buttonText="Start Clearance"
          pricingItems={[
            { label: "Processing Error", value: `₦${(pricing?.ninServices?.ipe?.inProcessingError || 1000).toLocaleString()}` },
            { label: "Invalid Tracking", value: `₦${(pricing?.ninServices?.ipe?.invalidTracking || 1000).toLocaleString()}` }
          ]}
          description="Resolve database processing exceptions and identity roadblocks."
        />
        <ServiceCard 
          title="Modification" icon={<Fingerprint size={28} />} color="bg-emerald-500" route="/nin-services/modification"
          buttonText="Start Modification"
          pricingItems={[
            { label: "Name Change", value: `₦${(pricing?.ninServices?.modification?.name || 12000).toLocaleString()}` },
            { label: "DOB Change", value: `₦${(pricing?.ninServices?.modification?.dob || 50000).toLocaleString()}` }
          ]}
          description="Submit secure pipelines for data property corrections."
        />
      </div>
    </div>
  );
}