import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck, BadgeCheck, Clock3, ArrowRight, CheckCircle2, Wallet, Users, FileCheck2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();

  // Optimized auth check: redirects immediately if user is already logged in
  useEffect(() => {
    if (localStorage.getItem("user")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* NAVBAR */}
      <header className="relative z-20 border-b border-white/10 backdrop-blur-xl bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="logo" className="w-10 h-10 object-contain" />
            <img src="/logofull.png" alt="logo full" className="h-8 object-contain hidden md:block" />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/login")} className="text-sm text-white/80 hover:text-white transition">Login</button>
            <button onClick={() => navigate("/register")} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-lg">Get Started</button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-sm text-blue-200 mb-6">
              <ShieldCheck size={16} /> Secure NIN Verification Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-tight">
              Verify NIN <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Fast</span><br />
              Process Requests Professionally
            </h1>
            <p className="mt-8 text-lg text-white/70 max-w-lg leading-relaxed">
              Built for agents, cybercafés, and professionals who need fast, reliable, and secure identity verification with real-time management.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button onClick={() => navigate("/register")} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 px-8 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-2 transition-transform hover:scale-[1.02]">
                Create Account <ArrowRight size={18} />
              </button>
              <button onClick={() => navigate("/login")} className="border border-white/15 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl font-semibold backdrop-blur transition">Login</button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="bg-white/[0.04] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <div><p className="text-white/50 text-sm">Active Platform</p><h2 className="text-2xl font-black mt-1">Xcombinator</h2></div>
              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center"><CheckCircle2 size={30} className="text-green-400" /></div>
            </div>
            <div className="space-y-4">
              <FeatureCard icon={<BadgeCheck className="text-blue-400" />} title="NIN Validation" desc="Validate records instantly with accurate data." />
              <FeatureCard icon={<FileCheck2 className="text-indigo-400" />} title="Modification Requests" desc="Handle corrections professionally with tracking." />
              <FeatureCard icon={<Wallet className="text-cyan-400" />} title="Wallet & Units" desc="Fund accounts and process tasks without delays." />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16"><h2 className="text-4xl font-black">Built For Serious Operations</h2></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<ShieldCheck />} color="blue" title="Secure" desc="Top-tier data protection." />
          <StatCard icon={<Clock3 />} color="indigo" title="Fast" desc="Optimized response times." />
          <StatCard icon={<Users />} color="cyan" title="Multi-User" desc="Perfect for team scaling." />
          <StatCard icon={<Wallet />} color="green" title="Wallet" desc="Efficient budget management." />
        </div>
      </section>
    </div>
  );
}

// Simplified sub-components to keep the file clean
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
      <div><h3 className="font-semibold">{title}</h3><p className="text-white/60 text-sm mt-1">{desc}</p></div>
    </div>
  );
}

function StatCard({ icon, color, title, desc }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.06] transition">
      <div className={`w-14 h-14 rounded-2xl bg-${color}-500/20 flex items-center justify-center mb-6`}>{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}