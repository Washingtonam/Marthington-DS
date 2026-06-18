import { useState, useMemo } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../../lib/axios";
import {
  ShieldCheck,
  Phone,
  Loader2,
  UserSearch,
  ArrowRight,
  Wallet,
  BadgeCheck,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatNaira } from "../../lib/currency";

export default function VerifyNIN() {
  const { user, walletBalance, setBalance } = useUser();
  const { error, success } = useToast();
  const navigate = useNavigate();
  
  const [method, setMethod] = useState("nin");
  const [loading, setLoading] = useState(false);
  const [nin, setNin] = useState("");
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState({ firstname: "", surname: "", gender: "", birthdate: "" });
  const [touched, setTouched] = useState({ nin: false, phone: false, firstname: false, surname: false, gender: false, birthdate: false });

  const unitsRequired = useMemo(() => ["phone", "demographic"].includes(method) ? 2 : 1, [method]);

  const unitPrice = 250; // legacy per-unit value; cost calculation remains in Naira
  const costInNaira = unitsRequired * unitPrice;
  const hasEnoughFunds = user?.isAdmin || (walletBalance ?? 0) >= costInNaira;
  const priceLabel = `Cost: ${formatNaira(costInNaira)}`;

  const isNinValid = method !== "nin" || nin.length === 11;
  const isPhoneValid = method !== "phone" || phone.length >= 10;
  const isDemographicValid =
    method !== "demographic" || Object.values(form).every((value) => value.trim().length > 0);
  const isFormValid = method === "nin" ? isNinValid : method === "phone" ? isPhoneValid : isDemographicValid;

  const showError = (message) => {
    error(message, 5000);
  };


  const handleVerify = async () => {
    if (loading) return;

    if (method === "nin") {
      setTouched((prev) => ({ ...prev, nin: true }));
      if (nin.length !== 11) return showError("NIN must be 11 digits");
    }

    if (method === "phone") {
      setTouched((prev) => ({ ...prev, phone: true }));
      if (phone.length < 10) return showError("Enter a valid phone number");
    }

    if (method === "demographic") {
      setTouched((prev) => ({ ...prev, firstname: true, surname: true, gender: true, birthdate: true }));
      if (!isDemographicValid) return showError("Please complete all demographic fields");
    }

    const isAdmin = user?.isAdmin;
    if (!isAdmin && !hasEnoughFunds) {
      return showError(`Insufficient balance. Need ${formatNaira(costInNaira)}`);
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const payload = {
          method,
          consent: true,
          ...(method === "nin" ? { nin } : method === "phone" ? { phone } : { firstname: form.firstname, surname: form.surname, gender: form.gender, birthdate: form.birthdate }),
        };

        const res = await api.post("/api/services/verify", payload, {
          signal: controller.signal,
        });

      const data = res.data;
      if (!res || data.error) throw new Error(data?.error || "Verification failed");

      // Deduct cost locally (backend should perform atomic deduction and ledger logging)
      try {
        // Update local balance deterministically (backend should be source of truth)
        setBalance(Number((walletBalance ?? 0) - costInNaira));
      } catch (e) {
        console.warn("Failed to update local balance", e);
      }

      success("Verification successful.");
      localStorage.setItem("nin_result", JSON.stringify(data));
      navigate(`/verify-result/${data.requestId || ""}`);
    } catch (err) {
      showError(err.name === "AbortError" ? "Request timed out. Please try again." : err.message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pt-4 px-4">
      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black">Verify Identity</h1>
            <p className="text-white/70 mt-1">Fast, secure identity verification services</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:min-w-[320px]">
              <div className="bg-white/10 backdrop-blur rounded-3xl p-6">
                <p className="text-white/70 text-sm">Wallet Balance</p>
                <h2 className="text-4xl font-black">{formatNaira(walletBalance ?? 0)}</h2>
              </div>
          </div>
        </div>
      </motion.div>

      {/* Method Selection */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {[
          { key: "nin", label: "NIN", icon: ShieldCheck },
          { key: "phone", label: "Phone", icon: Phone },
          { key: "demographic", label: "Demographic", icon: UserSearch },
        ].map((m) => (
          <button key={m.key} type="button" onClick={() => setMethod(m.key)} className={`p-6 rounded-[2rem] transition border text-left ${method === m.key ? "bg-blue-600 text-white border-blue-600 shadow-xl" : "bg-white dark:bg-[#111827] border-gray-200"}`}>
            <m.icon size={28} className={method === m.key ? "text-white" : "text-blue-600"} />
            <h2 className="font-bold mt-4">{m.label}</h2>
          </button>
        ))}
      </div>

      {/* Dynamic Form */}
      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border p-8">
        <AnimatePresence mode="wait">
          {method === "nin" && (
            <div className="relative mb-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 11-digit NIN"
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                onBlur={() => setTouched((prev) => ({ ...prev, nin: true }))}
                className={`w-full bg-gray-50 p-4 rounded-2xl border transition ${touched.nin && !isNinValid ? "border-red-400 ring-1 ring-red-300 bg-red-50" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`}
              />
              {(touched.nin || nin) && (
                <div className="absolute top-1/2 right-4 -translate-y-1/2">
                  {isNinValid ? <CheckCircle size={20} className="text-green-500" /> : <AlertTriangle size={20} className="text-red-500" />}
                </div>
              )}
              {!isNinValid && touched.nin && <p className="mt-3 text-sm text-red-600">NIN must be exactly 11 digits.</p>}
            </div>
          )}

          {method === "phone" && (
            <div className="relative mb-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                className={`w-full bg-gray-50 p-4 rounded-2xl border transition ${touched.phone && !isPhoneValid ? "border-red-400 ring-1 ring-red-300 bg-red-50" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`}
              />
              {(touched.phone || phone) && (
                <div className="absolute top-1/2 right-4 -translate-y-1/2">
                  {isPhoneValid ? <CheckCircle size={20} className="text-green-500" /> : <AlertTriangle size={20} className="text-red-500" />}
                </div>
              )}
              {!isPhoneValid && touched.phone && <p className="mt-3 text-sm text-red-600">Enter a valid phone number.</p>}
            </div>
          )}

          {method === "demographic" && (
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: "firstname", placeholder: "First Name" },
                { name: "surname", placeholder: "Surname" },
              ].map((field) => {
                const value = form[field.name];
                const invalid = touched[field.name] && !value.trim();
                return (
                  <div key={field.name} className="relative">
                    <input
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                      onBlur={() => setTouched((prev) => ({ ...prev, [field.name]: true }))}
                      className={`w-full bg-gray-50 p-4 rounded-2xl border transition ${invalid ? "border-red-400 ring-1 ring-red-300 bg-red-50" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`}
                    />
                    {value && (
                      <div className="absolute top-1/2 right-4 -translate-y-1/2">
                        {invalid ? <AlertTriangle size={20} className="text-red-500" /> : <CheckCircle size={20} className="text-green-500" />}
                      </div>
                    )}
                    {invalid && <p className="mt-3 text-sm text-red-600">This field is required.</p>}
                  </div>
                );
              })}
              <div className="relative">
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  onBlur={() => setTouched((prev) => ({ ...prev, gender: true }))}
                  className={`w-full bg-gray-50 p-4 rounded-2xl border transition ${touched.gender && !form.gender ? "border-red-400 ring-1 ring-red-300 bg-red-50" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`}
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                {form.gender && (
                  <div className="absolute top-1/2 right-4 -translate-y-1/2">
                    <CheckCircle size={20} className="text-green-500" />
                  </div>
                )}
                {touched.gender && !form.gender && <p className="mt-3 text-sm text-red-600">Select a gender.</p>}
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                  onBlur={() => setTouched((prev) => ({ ...prev, birthdate: true }))}
                  className={`w-full bg-gray-50 p-4 rounded-2xl border transition ${touched.birthdate && !form.birthdate ? "border-red-400 ring-1 ring-red-300 bg-red-50" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`}
                />
                {form.birthdate && (
                  <div className="absolute top-1/2 right-4 -translate-y-1/2">
                    <CheckCircle size={20} className="text-green-500" />
                  </div>
                )}
                {touched.birthdate && !form.birthdate && <p className="mt-3 text-sm text-red-600">Select a birthdate.</p>}
              </div>
            </div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50/90 px-4 py-3 border border-slate-200 shadow-sm">
            <p className="text-slate-500">{priceLabel}</p>
          </div>
          <div className="rounded-2xl bg-slate-50/90 px-4 py-3 border border-slate-200 shadow-sm">
            <p className="text-slate-500">{walletLabel}</p>
          </div>
        </div>

        {/* Security Assurance Note */}
        <div className="mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Your data is secure</p>
              <p className="text-xs text-blue-800">
                Your information is encrypted in transit using TLS 1.3 and handled in compliance with NDPR. 
                <Link to="/legal/privacy" className="text-blue-600 hover:underline ml-1">Learn more</Link>
              </p>
            </div>
          </div>
        </div>

        <motion.button
          onClick={handleVerify}
          disabled={loading || !hasEnoughFunds || !isFormValid}
          whileHover={loading ? {} : { scale: 1.02 }}
          whileTap={loading ? {} : { scale: 0.98 }}
          className={`w-full mt-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition ${hasEnoughFunds ? "bg-blue-600 hover:bg-blue-700 shadow-xl text-white" : "bg-slate-400 text-slate-100 cursor-not-allowed"} ${loading ? "animate-pulse/80" : ""}`}
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              Verify Identity — {formatNaira(costInNaira)} <ArrowRight size={18} />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}