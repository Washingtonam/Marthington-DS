import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck, ArrowRight, Zap, RefreshCw, Wallet, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full" />
      </div>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <span className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium tracking-wide uppercase">
            Identity Infrastructure 2026
          </span>
          <h1 className="text-6xl md:text-8xl font-black mt-8 mb-6 tracking-tighter">
            Verification, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Made Effortless.
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Marthington empowers agents and businesses to verify identities, process modifications, and manage workflows with professional-grade precision.
          </p>
          
          <div className="mt-12 flex items-center justify-center gap-4">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/register")} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition">
              Get Started Free <ArrowRight size={18} />
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* BENTO GRID FEATURES */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-4">
          <BentoCard title="Instant Validation" icon={<Zap className="text-yellow-400" />} className="md:col-span-2 bg-gradient-to-br from-slate-900 to-blue-900/20" />
          <BentoCard title="NIN Modification" icon={<RefreshCw className="text-blue-400" />} />
          <BentoCard title="Wallet Management" icon={<Wallet className="text-green-400" />} />
          <BentoCard title="Admin Dashboard" icon={<LayoutDashboard className="text-purple-400" />} className="md:col-span-2" />
        </div>
      </section>
    </div>
  );
}

function BentoCard({ title, icon, className = "" }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">{icon}</div>
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="text-white/50 mt-2">Professional tools for verified identity management.</p>
    </motion.div>
  );
}