import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  ShieldCheck,
  ArrowRight,
  Zap,
  RefreshCw,
  Wallet,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        navigate(parsedUser?.role === "admin" || parsedUser?.role === "super_admin" ? "/admin" : "/dashboard");
      } catch {
        navigate("/dashboard");
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_45%,_#fdfcff_100%)] text-slate-900 selection:bg-blue-500/25">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute right-[-5%] top-[-8%] h-[520px] w-[520px] rounded-full bg-blue-400/20 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-8%] h-[480px] w-[480px] rounded-full bg-indigo-300/20 blur-[140px]" />
        <motion.div
          animate={{ y: [0, -18, 0], x: [0, 16, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[8%] top-[18%] h-24 w-24 rounded-full border border-blue-200/70 bg-white/70 shadow-[0_10px_40px_rgba(59,130,246,0.12)] backdrop-blur"
        />
        <motion.div
          animate={{ y: [0, 24, 0], x: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[10%] top-[26%] h-16 w-16 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-white to-indigo-50 shadow-[0_10px_35px_rgba(79,70,229,0.15)]"
        />
      </div>

      <header className="relative z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-slate-900">Marthington</p>
              <p className="text-xs text-slate-500">Identity Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              Login
            </button>
            <button onClick={() => navigate("/register")} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 text-center md:py-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
            <Sparkles size={16} /> Identity Infrastructure 2026
          </motion.div>
          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-tight text-slate-900 sm:text-6xl md:text-7xl lg:text-8xl">
            <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="block">
              Verification,
            </motion.span>
            <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              Made Effortless.
            </motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }} className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Marthington helps agents and businesses verify identities, process modifications, and manage operations with a polished, professional workflow.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => navigate("/register")} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(37,99,235,0.25)] transition">
              Get Started Free <ArrowRight size={18} />
            </motion.button>
            <button onClick={() => navigate("/login")} className="rounded-full border border-slate-300 bg-white/70 px-8 py-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white">
              Login
            </button>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          <BentoCard index={0} title="Instant Validation" icon={<Zap className="text-amber-500" />} description="Quick, reliable verification with a professional flow." className="md:col-span-2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white" />
          <BentoCard index={1} title="NIN Modification" icon={<RefreshCw className="text-blue-500" />} description="Manage updates and corrections without friction." />
          <BentoCard index={2} title="Wallet Management" icon={<Wallet className="text-emerald-500" />} description="Track transactions and fund operations with confidence." />
          <BentoCard index={3} title="Admin Dashboard" icon={<LayoutDashboard className="text-violet-500" />} description="Keep oversight clean, fast, and structured for your team." className="md:col-span-2 bg-gradient-to-br from-white to-slate-50" />
        </div>

        <div className="mt-6 rounded-[2rem] border border-slate-200/80 bg-white/70 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Why teams choose Marthington</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Professional tools for a faster, brighter workflow.</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 size={16} /> Secure by design
              </div>
              <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                <CheckCircle2 size={16} /> Fast response times
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BentoCard({ title, icon, description, className = "", index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className={`rounded-[1.75rem] border border-slate-200/80 bg-white/75 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl transition ${className}`}
    >
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </motion.div>
  );
}