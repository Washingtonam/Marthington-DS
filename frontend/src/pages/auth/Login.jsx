import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, LockKeyhole, Mail, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// 🔥 IMPORT THE SECURE MODULAR LOGIN ACTION
import { login } from "../../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ==========================================
  // 🔐 SECURE AUTH HANDLER
  // ==========================================
  const handleLogin = async () => {
    if (!email || !password) {
      return alert("Enter email and password");
    }

    setLoading(true);

    try {
      // Cleanly pass parameters into our secure unified modular API layer
      const data = await login({ email, password });

      // If login succeeds, store user details and the session JWT
      if (data && data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("email", data.user.email);
        localStorage.setItem("token", data.token); // Crucial for Axios interceptor authorization headers

        navigate("/dashboard");
      } else {
        throw new Error("Invalid response structural context payload received from server.");
      }

    } catch (error) {
      console.error("🔥 LOGIN SUBMISSION EXCEPTION:", error);
      alert(error.response?.data?.message || error.message || "Authentication processing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* BACKGROUND GLOW */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full" />

      {/* GRID */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] [background-size:22px_22px]" />

      {/* CONTAINER */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 backdrop-blur-xl"
      >
        {/* LEFT SIDE */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-12 relative overflow-hidden">
          {/* GLOW */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

          {/* TOP */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                <ShieldCheck size={30} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Xcombinator</h1>
                <p className="text-white/70 text-sm">Secure Identity Platform</p>
              </div>
            </div>

            <h2 className="text-5xl font-black leading-tight max-w-md">
              Fast & Secure NIN Verification
            </h2>

            <p className="mt-6 text-white/70 leading-relaxed max-w-lg">
              Built for agents, businesses and professionals who need reliable identity verification with speed,
              transparency and enterprise-grade security.
            </p>
          </div>

          {/* BOTTOM */}
          <div className="relative z-10 space-y-4">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-semibold">Trusted Verification</h3>
                  <p className="text-sm text-white/70">Secure processing and real-time results</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <LockKeyhole size={22} />
                </div>
                <div>
                  <h3 className="font-semibold">Enterprise Security</h3>
                  <p className="text-sm text-white/70">Encrypted systems with protected access</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-white dark:bg-[#0F172A] p-8 md:p-12 flex items-center">
          <div className="w-full max-w-md mx-auto">
            {/* MOBILE LOGO */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white">Xcombinator</h1>
              <p className="text-gray-500 mt-2">Secure Identity Platform</p>
            </div>

            {/* HEADER */}
            <div className="mb-8">
              <h2 className="text-4xl font-black text-gray-900 dark:text-white">Welcome Back 👋</h2>
              <p className="text-gray-500 mt-3">
                Login to continue managing your verifications and requests securely.
              </p>
            </div>

            {/* FORM */}
            <div className="space-y-5">
              {/* EMAIL */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Email Address
                </label>
                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                  <Mail size={18} className="text-gray-400" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent outline-none w-full text-sm"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Password
                </label>
                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                  <LockKeyhole size={18} className="text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent outline-none w-full text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* FORGOT */}
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              {/* BUTTON */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white py-4 rounded-2xl font-semibold transition-all shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? "Processing..." : (
                  <>
                    Login
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            {/* FOOTER */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Don’t have an account?{" "}
                <span
                  onClick={() => navigate("/register")}
                  className="text-blue-600 font-semibold cursor-pointer hover:underline"
                >
                  Create Account
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}