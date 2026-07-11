import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, LockKeyhole, Mail, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import { login } from "../../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return alert("Enter email and password");
    }

    setLoading(true);

    try {
      const data = await login({ email, password });

      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("email", data.user.email);
        localStorage.setItem("token", data.token);

        const destination = data.user?.role === "admin" || data.user?.role === "super_admin" ? "/admin" : "/dashboard";
        navigate(destination);
      } else {
        throw new Error("Invalid response payload from server.");
      }
    } catch (error) {
      console.error("🔥 LOGIN SUBMISSION EXCEPTION:", error);
      alert(
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Authentication processing failed."
      );
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
              <Sparkles size={16} /> Premium access for modern teams
            </div>

            <h2 className="max-w-md text-5xl font-black leading-tight">Welcome back to your secure workspace.</h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-white/70">Access your verifications, requests, and wallet from a beautifully designed portal built for speed and confidence.</p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="font-semibold">Fast, trusted verification</h3>
                  <p className="text-sm text-white/70">Secure processing with real-time visibility.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                  <LockKeyhole size={22} />
                </div>
                <div>
                  <h3 className="font-semibold">Protected access</h3>
                  <p className="text-sm text-white/70">Encrypted sessions and role-based control.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-white/70 p-8 md:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 lg:hidden">
                <Sparkles size={14} /> Premium access
              </div>
              <h2 className="text-4xl font-black text-slate-900">Welcome back 👋</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Log in to continue your flow with a polished, secure experience.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
                  <Mail size={18} className="text-slate-400" />
                  <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-500">
                  <LockKeyhole size={18} className="text-slate-400" />
                  <input type={showPassword ? "text" : "password"} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 transition hover:text-slate-700">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link to="/forgot-password" className="text-sm font-medium text-blue-600 transition hover:underline">Forgot Password?</Link>
              </div>

              <button onClick={handleLogin} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(37,99,235,0.25)] transition hover:opacity-90">
                {loading ? "Processing..." : (<><span>Login</span><ArrowRight size={18} /></>)}
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">Don’t have an account? <span onClick={() => navigate("/register")} className="cursor-pointer font-semibold text-blue-600 transition hover:underline">Create Account</span></p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}