import { useState } from "react";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Phone,
  Loader2,
  UserSearch,
  ArrowRight,
  Wallet,
  BadgeCheck,
} from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyNIN() {
  const { user, units, setUnits } = useUser();
  const navigate = useNavigate();
  const [method, setMethod] = useState("nin");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("bundle");
  const [nin, setNin] = useState("");
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState({
    firstname: "",
    surname: "",
    gender: "",
    birthdate: "",
  });

  // =========================
  // COST CALCULATOR (Units Only)
  // =========================
  const unitsRequired = ["phone", "demographic"].includes(method) ? 2 : 1;

  // =========================
  // VERIFY ACTION SUBMIT
  // =========================
  const handleVerify = async () => {
    if (loading) return;

    // ================= VALIDATION =================
    if (method === "nin" && nin.length !== 11) {
      return alert("Enter valid 11-digit NIN");
    }

    if (method === "phone" && phone.length < 10) {
      return alert("Enter valid phone number");
    }

    if (method === "demographic") {
      if (!form.firstname || !form.surname || !form.gender || !form.birthdate) {
        return alert("Complete all demographic fields");
      }
    }

    const isAdmin = user?.email?.toLowerCase().trim() === "washingtonamedu@gmail.com";

    if (!isAdmin && units < unitsRequired) {
      return alert(`This action requires ${unitsRequired} units`);
    }

    setLoading(true);

    try {
      await  api("https://xcombinator.onrender.com/api/pricing");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      let payload = {
        userId: user.id,
        method,
      };

      if (method === "nin") payload.nin = nin;
      if (method === "phone") payload.phone = phone;
      if (method === "demographic") {
        payload.firstname = form.firstname;
        payload.surname = form.surname;
        payload.gender = form.gender;
        payload.birthdate = form.birthdate;
      }

      const res = await  api("https://xcombinator.onrender.com/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res;

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setUnits(data.units);
      setMode(data.mode || "bundle");
      localStorage.setItem("nin_result", JSON.stringify(data));
      navigate("/verify-result");
    } catch (err) {
      console.error(err);
      if (err.name === "AbortError") {
        alert("⏳ Server timeout. Try again.");
      } else {
        alert(err.message || "Verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    { key: "nin", label: "NIN", icon: ShieldCheck, desc: "Direct NIN verification" },
    { key: "phone", label: "Phone", icon: Phone, desc: "Search via phone number" },
    { key: "demographic", label: "Demographic", icon: UserSearch, desc: "Search using personal details" },
  ];

  return (
    <div className="max-w-6xl mx-auto pt-4">
      {/* HERO HERO SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-8"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center">
                <ShieldCheck size={34} />
              </div>
              <div>
                <h1 className="text-4xl font-black">Verify Identity</h1>
                <p className="text-white/70 mt-1">Fast, secure and professional identity verification</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl px-5 py-4 w-fit">
              <BadgeCheck size={18} />
              <p className="text-sm">Trusted by agents, banks and businesses</p>
            </div>
          </div>

          <div className="bg-white/10 border border-white/10 backdrop-blur rounded-3xl p-6 min-w-[240px]">
            <div className="flex items-center gap-3 mb-3">
              <Wallet size={20} />
              <p className="text-white/70 text-sm">Available Units</p>
            </div>
            <h2 className="text-5xl font-black">{units}</h2>
            <div className="mt-4 text-sm text-white/70">
              Cost: <b>{unitsRequired} unit(s)</b>
            </div>
          </div>
        </div>
      </motion.div>

      {/* METHODS TAB SELECTOR GRID */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {methods.map((m) => {
          const Icon = m.icon;
          return (
            <motion.div
              whileHover={{ y: -5 }}
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={`rounded-[2rem] p-6 cursor-pointer transition border ${
                method === m.key
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xl"
                  : "bg-white dark:bg-[#111827] border-gray-100 dark:border-gray-800 hover:shadow-xl"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${method === m.key ? "bg-white/20" : "bg-blue-100 dark:bg-blue-500/10"}`}>
                  <Icon size={26} className={method === m.key ? "text-white" : "text-blue-600"} />
                </div>
                {method === m.key && <BadgeCheck size={20} />}
              </div>
              <h2 className="font-bold text-lg mt-5">{m.label}</h2>
              <p className={`text-sm mt-2 ${method === m.key ? "text-white/80" : "text-gray-500"}`}>{m.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* DYNAMIC FORM RENDERING PANELS */}
      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
        {method === "nin" && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Enter NIN</label>
            <div className="relative">
              <ShieldCheck size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                placeholder="22233445566"
                value={nin}
                onChange={(e) => setNin(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
              />
            </div>
          </div>
        )}

        {method === "phone" && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Phone Number</label>
            <div className="relative">
              <Phone size={20} className="absolute left-4 top-4 text-gray-400" />
              <input
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
              />
            </div>
          </div>
        )}

        {method === "demographic" && (
          <div className="grid md:grid-cols-2 gap-5 animate-fadeIn">
            <input placeholder="First Name" onChange={(e) => setForm({ ...form, firstname: e.target.value })} className="bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium" />
            <input placeholder="Surname" onChange={(e) => setForm({ ...form, surname: e.target.value })} className="bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium" />
            <select onChange={(e) => setForm({ ...form, gender: e.target.value })} className="bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium">
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <input type="date" onChange={(e) => setForm({ ...form, birthdate: e.target.value })} className="bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium" />
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-bold transition flex items-center justify-center gap-3 shadow-xl"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Verifying...
            </>
          ) : (
            <>
              Verify Identity
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}