import { useState, useMemo } from "react";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/axios";
import {
  ShieldCheck,
  Phone,
  Loader2,
  UserSearch,
  ArrowRight,
  Wallet,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VerifyNIN() {
  const { user, units, setUnits } = useUser();
  const navigate = useNavigate();
  
  const [method, setMethod] = useState("nin");
  const [loading, setLoading] = useState(false);
  const [nin, setNin] = useState("");
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState({ firstname: "", surname: "", gender: "", birthdate: "" });

  const unitsRequired = useMemo(() => 
    ["phone", "demographic"].includes(method) ? 2 : 1, 
  [method]);

  const handleVerify = async () => {
    if (loading) return;

    // Validation Guard Clauses
    if (method === "nin" && nin.length !== 11) return alert("NIN must be 11 digits");
    if (method === "phone" && phone.length < 10) return alert("Enter a valid phone number");
    if (method === "demographic" && Object.values(form).some(v => !v)) return alert("Complete all fields");

    const isAdmin = user?.email?.toLowerCase().trim() === process.env.REACT_APP_SUPER_ADMIN_EMAIL;
    if (!isAdmin && units < unitsRequired) return alert(`Insufficient units. Need ${unitsRequired}`);

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const payload = { userId: user.id, method, ...(method === "nin" ? { nin } : method === "phone" ? { phone } : form) };

      const res = await api.post("/services/verify", payload, {
        signal: controller.signal,
      });

      const data = res.data;
      if (!res) throw new Error(data?.error || "Verification failed");

      setUnits(data.units);
      localStorage.setItem("nin_result", JSON.stringify(data));
      navigate("/verify-result");
    } catch (err) {
      alert(err.name === "AbortError" ? "Request timed out. Please try again." : err.message);
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
          <div className="bg-white/10 backdrop-blur rounded-3xl p-6 min-w-[200px]">
            <p className="text-white/70 text-sm">Available Units</p>
            <h2 className="text-4xl font-black">{units}</h2>
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
          <div key={m.key} onClick={() => setMethod(m.key)} className={`p-6 rounded-[2rem] cursor-pointer transition border ${method === m.key ? "bg-blue-600 text-white border-blue-600 shadow-xl" : "bg-white dark:bg-[#111827] border-gray-200"}`}>
            <m.icon size={28} className={method === m.key ? "text-white" : "text-blue-600"} />
            <h2 className="font-bold mt-4">{m.label}</h2>
          </div>
        ))}
      </div>

      {/* Dynamic Form */}
      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border p-8">
        <AnimatePresence mode="wait">
          {method === "nin" && (
            <input type="number" placeholder="Enter 11-digit NIN" value={nin} onChange={(e) => setNin(e.target.value.slice(0, 11))} className="w-full bg-gray-50 p-4 rounded-2xl border mb-4" />
          )}
          {method === "phone" && (
            <input type="number" placeholder="Enter Phone Number" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 11))} className="w-full bg-gray-50 p-4 rounded-2xl border mb-4" />
          )}
          {method === "demographic" && (
            <div className="grid md:grid-cols-2 gap-4">
              <input placeholder="First Name" onChange={(e) => setForm({...form, firstname: e.target.value})} className="bg-gray-50 p-4 rounded-2xl border" />
              <input placeholder="Surname" onChange={(e) => setForm({...form, surname: e.target.value})} className="bg-gray-50 p-4 rounded-2xl border" />
              <select onChange={(e) => setForm({...form, gender: e.target.value})} className="bg-gray-50 p-4 rounded-2xl border">
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <input type="date" onChange={(e) => setForm({...form, birthdate: e.target.value})} className="bg-gray-50 p-4 rounded-2xl border" />
            </div>
          )}
        </AnimatePresence>

        <button onClick={handleVerify} disabled={loading} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition">
          {loading ? <Loader2 className="animate-spin" /> : <>Verify Identity ({unitsRequired} units) <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}