import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../lib/axios"; // Use your configured axios instance
import { 
  ShieldCheck, ArrowRight, FileCheck, RefreshCcw, 
  Fingerprint, Loader2, Sparkles, UserCog 
} from "lucide-react";
import { motion } from "framer-motion";

export default function NINServices() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(true);

  // Configuration for all services - easily expandable!
  const serviceList = [
    { id: 'validation', title: 'Validation', icon: <FileCheck />, color: 'bg-blue-500', route: '/nin-services/validation', desc: 'Instant registry sync.' },
    { id: 'ipe', title: 'IPE Clearance', icon: <RefreshCcw />, color: 'bg-indigo-500', route: '/nin-services/ipe-clearance', desc: 'Resolve processing roadblocks.' },
    { id: 'modification', title: 'Modification', icon: <Fingerprint />, color: 'bg-emerald-500', route: '/nin-services/modification', desc: 'Secure data corrections.' },
    { id: 'personalization', title: 'Personalization', icon: <Sparkles />, color: 'bg-purple-500', route: '/nin-services/personalization', desc: 'Requires 15-digit tracking ID.', badge: 'NEW' },
    { id: 'selfService', title: 'Self Service', icon: <UserCog />, color: 'bg-orange-500', route: '/nin-services/selfservice', desc: 'Email recovery & unlinking.', badge: 'NEW' }
  ];

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await api.get("/api/pricing");
        setPricing(res.data?.ninServices || {});
      } catch (err) { console.error("Pricing fetch error:", err); }
      finally { setLoading(false); }
    };
    fetchPricing();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-slate-950 to-blue-900 text-white p-10 rounded-[2rem] shadow-2xl mb-10">
        <h1 className="text-4xl font-black mb-2">NIMC Services</h1>
        <p className="text-white/70">Professional identity infrastructure powered by Marthington.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {serviceList.map((svc) => (
          <motion.div key={svc.id} whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2rem] shadow-lg border border-gray-100 flex flex-col">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-white ${svc.color} relative`}>
              {svc.icon}
              {svc.badge && <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">{svc.badge}</span>}
            </div>
            <h2 className="text-xl font-bold mb-2">{svc.title}</h2>
            <p className="text-gray-500 text-xs mb-6 flex-grow">{svc.desc}</p>
            
            <button onClick={() => navigate(svc.route)} className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-800 transition">
              Launch Service <ArrowRight size={16} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}