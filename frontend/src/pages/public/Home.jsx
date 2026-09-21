import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../lib/axios";
import {
  ArrowDown,
  ShieldCheck,
  ArrowRight,
  Zap,
  RefreshCw,
  Wallet,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
  LockKeyhole,
  MessageCircle,
  CreditCard,
  ChevronDown,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState({ verification: 1000, name: 12000, slip: 150 });

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

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const [{ data }, catalogResponse] = await Promise.all([
          api.get("/api/pricing"),
          api.get("/api/services/catalog", { params: { category: "NIN" } }),
        ]);
        const catalog = Array.isArray(catalogResponse.data?.services) ? catalogResponse.data.services : [];
        const verificationService = catalog.find((service) => service.serviceCode === "validation-noRecord")
          || catalog.find((service) => String(service.name || "").toLowerCase().includes("verification"));

        setPricing({
          verification: verificationService?.price || data?.ninServices?.validation?.noRecord || 1000,
          name: data?.ninServices?.modification?.name || 12000,
          slip: data?.ninServices?.slipPrice || 150,
        });
      } catch (error) {
        console.error("Public pricing load error:", error);
      }
    };

    loadPricing();
  }, []);

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
              Create Agent Account
            </button>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 text-center md:py-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
            <Sparkles size={16} /> NIN operations for modern agents
          </motion.div>
          <h1 className="mx-auto max-w-5xl text-5xl font-black tracking-tight text-slate-900 sm:text-6xl md:text-7xl lg:text-8xl">
            <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="block">
              Instant NIN verification
            </motion.span>
            <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              and modifications.
            </motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }} className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Process identity validation, NIN updates, and wallet transactions in seconds with a clear workflow built for agents and enterprise teams.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => navigate("/register")} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(37,99,235,0.25)] transition">
              Start Verifying Now <ArrowRight size={18} />
            </motion.button>
            <button onClick={() => navigate("/login")} className="rounded-full border border-slate-300 bg-white/70 px-8 py-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white">
              Login
            </button>
          </motion.div>
          <p className="mt-4 text-sm font-medium text-slate-500">No monthly subscription fees <span className="mx-2 text-slate-300">•</span> Instant account funding</p>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-3 rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:grid-cols-3">
          <TrustSignal icon={<ShieldCheck size={18} />} label="NDPR-aware workflows" />
          <TrustSignal icon={<LockKeyhole size={18} />} label="TLS-encrypted sessions" />
          <TrustSignal icon={<CreditCard size={18} />} label="Wallet-secured payments" />
        </div>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">See the workflow</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">From NIN search to response, without the guesswork.</h2>
            <p className="mt-5 leading-8 text-slate-600">Search, review the response, and keep every wallet transaction visible from one focused workspace.</p>
            <button onClick={() => navigate("/register")} className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              Open your workspace <ArrowRight size={17} />
            </button>
          </div>
          <ProductPreview />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <BentoCard dark index={0} title="Instant NIN Validation" icon={<Zap className="text-amber-400" />} description="Run NIN, phone, demographic, and tracking checks from one guided flow." className="md:col-span-2" />
          <BentoCard index={1} title="NIN Modification" icon={<RefreshCw className="text-blue-500" />} description="Manage updates and corrections without friction." />
          <BentoCard index={2} title="Wallet Management" icon={<Wallet className="text-emerald-500" />} description="Track transactions and fund operations with confidence." />
          <BentoCard index={3} title="Team Dashboard" icon={<LayoutDashboard className="text-violet-500" />} description="Keep requests, balances, and operational oversight structured." className="md:col-span-2 bg-gradient-to-br from-white to-slate-50" />
        </div>

        <PricingSection pricing={pricing} />
        <FaqSection />
      </section>

      <section className="relative z-10 border-t border-slate-200/80 bg-slate-950 px-6 py-14 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div><p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">Need a hand?</p><h2 className="mt-2 text-3xl font-black">Talk to support when it matters.</h2><p className="mt-2 text-white/60">Get help with onboarding, pending queries, or wallet funding.</p></div>
          <a href="https://wa.me/2348073200555" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-400"><MessageCircle size={18} /> WhatsApp Support</a>
        </div>
      </section>
      <a href="https://wa.me/2348073200555" target="_blank" rel="noreferrer" aria-label="Contact Marthington support on WhatsApp" className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-900/25 transition hover:scale-105 hover:bg-emerald-400"><MessageCircle size={24} /></a>
    </div>
  );
}

function TrustSignal({ icon, label }) {
  return <div className="flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700"><span className="text-blue-600">{icon}</span>{label}</div>;
}

function ProductPreview() {
  return <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-3 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
    <div className="rounded-[1.5rem] bg-slate-900 p-5 text-white">
      <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs text-white/50">MARTHINGTON WORKSPACE</p><p className="mt-1 font-bold">Verification desk</p></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/60">PRODUCT PREVIEW</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl bg-white p-4 text-slate-900"><div className="flex items-center gap-2 text-xs text-slate-400"><Search size={14} /> NIN verification</div><div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm"><span>Enter 11-digit NIN</span><span className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Search</span></div><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600"><CheckCircle2 size={15} /> Response appears in your workspace</div></div><div className="rounded-2xl bg-blue-600 p-4"><p className="text-xs text-blue-100">Wallet balance</p><p className="mt-2 text-2xl font-black">₦—</p><div className="mt-8 flex items-center gap-2 text-xs text-blue-100"><ArrowDown size={14} /> Fund wallet</div></div></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3"><PreviewStat label="Verification" value="Ready to search" /><PreviewStat label="Requests" value="Track status" /><PreviewStat label="Payments" value="Fund securely" /></div>
    </div>
  </div>;
}

function PreviewStat({ label, value }) { return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>; }

function PricingSection({ pricing }) {
  const items = [{ label: "NIN verification", value: pricing.verification, note: "per unit" }, { label: "Name modification", value: pricing.name, note: "service fee" }, { label: "Slip printing", value: pricing.slip, note: "add-on fee" }];
  return <section className="mt-20"><div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">Transparent pricing</p><h2 className="mt-2 text-4xl font-black text-slate-900">Know the cost before you start.</h2></div><p className="max-w-sm text-sm leading-6 text-slate-500">Prices reflect live catalog rates and may include third-party provider or network processing fees. Fund your wallet through Flutterwave or the configured gateway.</p></div><div className="grid gap-4 md:grid-cols-3">{items.map((item) => <div key={item.label} className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm"><p className="text-sm font-semibold text-slate-500">{item.label}</p><p className="mt-4 text-3xl font-black text-slate-900">₦{Number(item.value).toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">{item.note}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-600"><CheckCircle2 size={14} /> Wallet payment supported</div></div>)}</div><p className="mt-4 text-xs text-slate-500">Service total may combine the base verification fee with optional instant PDF slip generation.</p></section>;
}

function FaqSection() {
  const faqs = [
    ["How fast are NIN verification results delivered?", "Most validation requests return directly to your workspace after processing, with the status and response kept visible for follow-up."],
    ["What NIN modifications can I process?", "Available services include name, phone number, address, and date-of-birth modification workflows, subject to the live catalog."],
    ["Is there a minimum wallet funding amount?", "Funding options and any minimums are shown in the payment flow before you confirm a top-up."],
    ["What happens when a query is failed or pending?", "Your request remains visible in the workspace so you can track its status and contact support for the next step."],
  ];
  return <section className="mt-20"><div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">Questions, answered</p><h2 className="mt-2 text-4xl font-black text-slate-900">A clearer start for your team.</h2></div><div className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white/70 px-6 shadow-sm">{faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-slate-900"><span>{question}</span><ChevronDown size={18} className="shrink-0 text-slate-400 transition group-open:rotate-180" /></summary><p className="max-w-3xl pt-3 text-sm leading-7 text-slate-600">{answer}</p></details>)}</div></section>;
}

function BentoCard({ title, icon, description, className = "", index = 0, dark = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className={`rounded-[1.75rem] border p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl transition ${dark ? "border-white/10 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white" : "border-slate-200/80 bg-white/75"} ${className}`}
    >
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
        {icon}
      </div>
      <h3 className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>{title}</h3>
      <p className={`mt-2 text-sm leading-7 ${dark ? "text-slate-200" : "text-slate-600"}`}>{description}</p>
    </motion.div>
  );
}