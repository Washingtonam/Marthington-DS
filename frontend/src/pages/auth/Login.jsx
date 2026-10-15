import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { login } from "../../services/api";
import { useUser } from "../../context/UserContext";
import { useBranding } from "../../context/BrandingContext";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { businessName, businessTagline, businessLogoUrl } = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [approvalBlocked, setApprovalBlocked] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginMessage("");
    setApprovalBlocked(false);
    setLoading(true);

    try {
      const data = await login({ email, password });

      if (!data?.user || !data?.token) {
        throw new Error("We couldn’t sign you in. Please try again.");
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("token", data.token);
      localStorage.setItem("lastActivity", String(Date.now()));
      setUser(data.user);

      navigate(data.user.role === "admin" || data.user.role === "super_admin" ? "/admin" : "/dashboard");
    } catch (error) {
      console.error("LOGIN SUBMISSION ERROR:", error);
      setLoginMessage(
        error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || "Sign in failed. Please try again."
      );
      setApprovalBlocked(["ACCOUNT_PENDING_APPROVAL", "ACCOUNT_NOT_APPROVED"].includes(error.response?.data?.code));
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_48%,_#fdfcff_100%)] px-3 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="mb-5 flex items-center justify-between px-1 sm:px-2">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label={`${businessName} home`}>
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
              {businessLogoUrl ? <img src={businessLogoUrl} alt="" className="h-full w-full bg-white object-contain p-1" /> : <ShieldCheck size={21} />}
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">{businessName}</span>
              <span className="block text-xs text-slate-500">{businessTagline}</span>
            </span>
          </Link>
          <p className="text-sm text-slate-600">
            New here? <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800">Apply for access</Link>
          </p>
        </div>

        <section
          className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 shadow-[0_28px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        >
          <div className="grid min-h-[560px] lg:grid-cols-[1fr_1fr]">
            <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
              <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />
              <div className="relative">
                <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-blue-100">
                  <ShieldCheck size={15} /> SECURE WORKSPACE
                </span>
                <h1 className="max-w-md text-4xl font-black leading-tight xl:text-5xl">Welcome back to your workspace.</h1>
                <p className="mt-5 max-w-md text-sm leading-7 text-blue-100/80">
                  Sign in to manage service requests, account activity, and your wallet.
                </p>
              </div>
              <p className="relative text-xs text-white/60">Secure access for {businessName} agents and teams.</p>
            </aside>

            <div className="flex items-center p-5 sm:p-10 lg:p-12">
              <div className="mx-auto w-full max-w-md">
                <header className="mb-8">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 lg:hidden">Secure sign in</p>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Welcome back</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your registered email and password.</p>
                </header>

                <form onSubmit={handleLogin} className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                    <span className="relative block">
                      <Mail aria-hidden="true" size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className={`${inputClassName} pl-10`}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                    <span className="relative block">
                      <LockKeyhole aria-hidden="true" size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className={`${inputClassName} pr-11 pl-10`}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>

                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Forgot password?</Link>
                  </div>

                  {loginMessage && (
                    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                      {loginMessage}
                      {approvalBlocked && <a href="https://wa.me/2348073200555" target="_blank" rel="noreferrer" className="mt-1 block font-bold underline">Contact WhatsApp Support</a>}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? "Signing in..." : <>Sign in <ArrowRight size={17} /></>}
                  </button>
                </form>

                <p className="mt-7 text-center text-sm text-slate-500">
                  Need an account? <Link to="/register" className="font-semibold text-blue-700 hover:underline">Apply for agent access</Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
