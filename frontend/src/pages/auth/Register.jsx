import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { Eye, EyeOff, Mail, LockKeyhole, ShieldCheck, ArrowRight, Sparkles, CheckCircle2, User, Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nin: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";

    if (digits.startsWith("234")) {
      const rest = digits.slice(3);
      if (rest.length <= 3) return `+234 ${rest}`;
      if (rest.length <= 6) return `+234 ${rest.slice(0, 3)} ${rest.slice(3)}`;
      if (rest.length <= 9) return `+234 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
      return `+234 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 9)} ${rest.slice(9, 11)}`;
    }

    if (digits.startsWith("0")) {
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      if (digits.length <= 10) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)} ${digits.slice(10, 11)}`;
    }

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 11)}`;
  };

  const handleChange = (e) => {
    if (e.target.name === "phone") {
      setForm({ ...form, phone: formatPhoneNumber(e.target.value) });
      return;
    }

    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (Object.values(form).some((value) => !value)) return alert("Please complete all fields.");
    if (form.password !== form.confirmPassword) return alert("Passwords do not match.");
    if (form.nin.length < 11) return alert("Enter a valid 11-digit NIN.");

    const phonePattern = /^\+?[0-9\s().-]{8,15}$/;
    if (!phonePattern.test(form.phone)) return alert("Enter a valid WhatsApp/phone number.");

    setLoading(true);
    try {
      await api.post("/api/auth/register", { ...form, phone: form.phone.trim() });
      setIsSuccess(true);
      window.setTimeout(() => navigate("/login"), 1800);
    } catch (error) {
      console.error("🔥 REGISTRATION ERROR:", error);
      alert(error.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.20),_transparent_32%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_45%,_#fdfcff_100%)] px-4 py-10 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-[420px] w-[420px] rounded-full bg-blue-400/20 blur-[140px]" />
        <div className="absolute bottom-[-8%] right-[-6%] h-[420px] w-[420px] rounded-full bg-indigo-300/20 blur-[140px]" />
        <motion.div animate={{ y: [0, -12, 0], x: [0, 10, 0], rotate: [0, 6, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute left-[8%] top-[16%] h-20 w-20 rounded-full border border-blue-200/70 bg-white/70 shadow-[0_10px_40px_rgba(59,130,246,0.12)] backdrop-blur" />
        <motion.div animate={{ y: [0, 18, 0], x: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute right-[10%] top-[24%] h-14 w-14 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-white to-indigo-50 shadow-[0_10px_35px_rgba(79,70,229,0.15)]" />
      </div>

      {isSuccess && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 px-4 backdrop-blur">
          <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-md rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(16,185,129,0.15)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Account created successfully!</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Your account is ready. We’re taking you to sign in so you can get started.</p>
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <motion.span key={index} animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.12 }} className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-[0_30px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-12 text-white lg:flex">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Marthington</h1>
                <p className="text-sm text-white/70">Secure Identity Platform</p>
              </div>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-blue-100 backdrop-blur">
              <Sparkles size={16} /> Launch your journey in minutes
            </div>

            <h2 className="max-w-md text-5xl font-black leading-tight">Create a profile that feels premium from day one.</h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-white/70">Open your account, add your WhatsApp number, and start verifying with a polished experience designed to impress.</p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="font-semibold">Fast onboarding</h3>
                  <p className="text-sm text-white/70">Set up your account and start right away.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                  <Phone size={22} />
                </div>
                <div>
                  <h3 className="font-semibold">WhatsApp-ready contact</h3>
                  <p className="text-sm text-white/70">We keep your number handy for updates and support.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-white/70 p-8 md:p-12">
          <form onSubmit={handleRegister} className="mx-auto w-full max-w-md space-y-4">
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 lg:hidden">
                <Sparkles size={14} /> Lovely onboarding
              </div>
              <h2 className="text-4xl font-black text-slate-900">Create Account 🚀</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Your account setup should feel just as premium as the platform itself.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
                <label className="mb-2 block text-sm font-medium text-slate-700">First Name</label>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <input type="text" name="firstName" placeholder="First name" value={form.firstName} onChange={handleChange} className="w-full bg-transparent text-sm outline-none" required />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
                <label className="mb-2 block text-sm font-medium text-slate-700">Last Name</label>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <input type="text" name="lastName" placeholder="Last name" value={form.lastName} onChange={handleChange} className="w-full bg-transparent text-sm outline-none" required />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
              <label className="mb-2 block text-sm font-medium text-slate-700">NIN Number</label>
              <input type="text" name="nin" placeholder="Enter your NIN" value={form.nin} onChange={handleChange} className="w-full bg-transparent text-sm outline-none" required />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
              <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                <input type="email" name="email" placeholder="Enter your email" value={form.email} onChange={handleChange} className="w-full bg-transparent text-sm outline-none" required />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
              <label className="mb-2 block text-sm font-medium text-slate-700">WhatsApp / Phone Number</label>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />
                <input type="tel" name="phone" placeholder="e.g. 0803 000 0000" value={form.phone} onChange={handleChange} className="w-full bg-transparent text-sm outline-none" required />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <div className="flex items-center gap-2">
                <LockKeyhole size={16} className="text-slate-400" />
                <input type={showPassword ? "text" : "password"} name="password" placeholder="Create a strong password" value={form.password} onChange={handleChange} className="w-full bg-transparent text-sm outline-none" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 transition hover:text-slate-700">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
              <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
              <input type="password" name="confirmPassword" placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} className="w-full bg-transparent text-sm outline-none" required />
            </div>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(37,99,235,0.25)] transition hover:opacity-90">
              {loading ? "Creating account..." : (<><span>Create Account</span><ArrowRight size={18} /></>)}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}