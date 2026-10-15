import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import nigeriaLocationData from "nigeria-state-lga-data";
import api from "../../lib/axios";

const { getStates, getLgas } = nigeriaLocationData;
const STATES = getStates();

const initialForm = {
  firstName: "",
  lastName: "",
  nin: "",
  email: "",
  phone: "",
  address: "",
  state: "",
  lga: "",
  password: "",
  confirmPassword: "",
};

const inputClassName = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

function Field({ label, icon: Icon, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        {Icon && <Icon aria-hidden="true" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />}
        {children}
      </span>
    </label>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const lgas = useMemo(() => form.state ? getLgas(form.state) : [], [form.state]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setErrorMessage("");
    setForm((current) => ({
      ...current,
      [name]: name === "phone" ? value.replace(/[^\d+\s().-]/g, "").slice(0, 18) : value,
      ...(name === "state" ? { lga: "" } : {}),
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (form.nin.replace(/\D/g, "").length !== 11) {
      setErrorMessage("Enter a valid 11-digit NIN.");
      return;
    }
    if (form.password.length < 12) {
      setErrorMessage("Your password must be at least 12 characters long.");
      return;
    }
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[!@#$%^&*]/.test(form.password)) {
      setErrorMessage("Use uppercase and lowercase letters, a number, and a special character (!@#$%^&*).");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrorMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nin: form.nin.replace(/\D/g, ""),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("REGISTRATION ERROR:", error);
      setErrorMessage(error.response?.data?.error || "We couldn’t submit your application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_48%,_#fdfcff_100%)] px-3 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="mb-5 flex items-center justify-between px-1 sm:px-2">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Marthington home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
              <ShieldCheck size={21} />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">Marthington</span>
              <span className="block text-xs text-slate-500">Identity Platform</span>
            </span>
          </Link>
          <p className="text-sm text-slate-600">
            Have an account? <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">Log in</Link>
          </p>
        </div>

        <section
          className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 shadow-[0_28px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        >
          <div className="grid lg:grid-cols-[0.78fr_1.22fr]">
            <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
              <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
              <div className="relative">
                <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-blue-100">
                  <ShieldCheck size={15} /> AGENT ACCOUNT
                </span>
                <h1 className="max-w-sm text-4xl font-black leading-tight xl:text-5xl">One secure place to manage your work.</h1>
                <p className="mt-5 max-w-sm text-sm leading-7 text-blue-100/80">
                  Create your account to submit and track identity-service requests.
                </p>
              </div>
              <p className="relative mt-10 text-xs text-white/60">Your application is reviewed before account access is enabled.</p>
            </aside>

            <div className="p-5 sm:p-8 lg:p-10 xl:p-12">
              <header className="mb-6 sm:mb-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 lg:hidden">Agent registration</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Create your account</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Enter your details and residential location to apply for access.</p>
              </header>

              <form onSubmit={handleRegister} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" icon={UserRound}>
                    <input className={`${inputClassName} pl-10`} name="firstName" value={form.firstName} onChange={handleChange} autoComplete="given-name" placeholder="First name" required />
                  </Field>
                  <Field label="Last name" icon={UserRound}>
                    <input className={`${inputClassName} pl-10`} name="lastName" value={form.lastName} onChange={handleChange} autoComplete="family-name" placeholder="Last name" required />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email address" icon={Mail}>
                    <input className={`${inputClassName} pl-10`} type="email" name="email" value={form.email} onChange={handleChange} autoComplete="email" placeholder="you@example.com" required />
                  </Field>
                  <Field label="Phone / WhatsApp" icon={Phone}>
                    <input className={`${inputClassName} pl-10`} type="tel" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" placeholder="0803 000 0000" required />
                  </Field>
                </div>

                <Field label="NIN number">
                  <input className={inputClassName} inputMode="numeric" maxLength={11} name="nin" value={form.nin} onChange={handleChange} placeholder="11-digit NIN" required />
                </Field>

                <Field label="Residential address" icon={MapPin}>
                  <input className={`${inputClassName} pl-10`} name="address" value={form.address} onChange={handleChange} autoComplete="street-address" placeholder="House number and street" required />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="State">
                    <select className={inputClassName} name="state" value={form.state} onChange={handleChange} autoComplete="address-level1" required>
                      <option value="">Select your state</option>
                      {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </Field>
                  <Field label="Local government area">
                    <select className={inputClassName} name="lga" value={form.lga} onChange={handleChange} autoComplete="address-level2" disabled={!form.state} required>
                      <option value="">{form.state ? "Select your LGA" : "Select a state first"}</option>
                      {lgas.map((lga) => <option key={lga} value={lga}>{lga}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Password" icon={LockKeyhole}>
                    <input className={`${inputClassName} pr-11 pl-10`} type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} autoComplete="new-password" placeholder="At least 12 characters" required />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </Field>
                  <Field label="Confirm password" icon={LockKeyhole}>
                    <input className={`${inputClassName} pr-11 pl-10`} type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" placeholder="Re-enter password" required />
                    <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </Field>
                </div>

                <p className="text-xs leading-5 text-slate-500">Use uppercase and lowercase letters, a number, and a special character in your password.</p>
                {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{errorMessage}</p>}

                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? "Submitting application..." : <>Submit application <ArrowRight size={17} /></>}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {isSuccess && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white bg-white p-7 text-center shadow-2xl sm:p-9">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={28} /></span>
            <h2 className="text-2xl font-black text-slate-900">Application submitted</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Your details have been received. We’ll review your application and notify you when your account is ready.</p>
            <button type="button" onClick={() => navigate("/login")} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800">
              Continue to login <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
