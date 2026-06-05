import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/axios";
import { useUser } from "../../context/UserContext"
import {
  Building2,
  Users,
  Briefcase,
  Globe,
  Loader2,
  HelpCircle,
  ChevronDown,
  ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { formatNaira } from "../../lib/currency";

const SERVICE_OPTIONS = [
  { key: "sole_proprietorship", title: "Sole Proprietorship", icon: <Briefcase />, description: "Fast-form business registration for sole traders." },
  { key: "partnership", title: "Business Partnership", icon: <Users />, description: "Register a partnership with streamlined compliance." },
  { key: "limited_1m", title: "LTD Company (1M)", icon: <Building2 />, description: "Limited liability company setup for ₦1M share capital." },
  { key: "custom_ngo", title: "NGO & Custom", icon: <Globe />, description: "Tailored corporate solutions with expert support." }
];

const COMMON_FIELDS = [
  { name: "businessName1", label: "Business Name", placeholder: "Enter primary business name" },
  { name: "businessName2", label: "Alternate Name", placeholder: "Enter alternative or trading name" },
  { name: "companyEmail", label: "Email Address", placeholder: "Enter company email" },
  { name: "companyPhone", label: "Contact Phone", placeholder: "Enter company phone number" },
  { name: "category", label: "Business Category", placeholder: "Enter category or sector" },
  { name: "state", label: "State", placeholder: "State of operation" },
  { name: "lga", label: "Local Government", placeholder: "Local government area" },
  { name: "streetAddress", label: "Street Address", placeholder: "Business street address" },
  { name: "shopNo", label: "Suite/Shop Number", placeholder: "Suite or shop number (optional)", optional: true }
];

const PROPRIETOR_FIELDS = [
  { name: "fullName", label: "Full Name", placeholder: "Proprietor full name" },
  { name: "dob", label: "Date of Birth", placeholder: "YYYY-MM-DD", type: "date" },
  { name: "gender", label: "Gender", placeholder: "Gender" },
  { name: "phone", label: "Phone", placeholder: "Phone number" },
  { name: "nin", label: "NIN", placeholder: "National Identification Number" },
  { name: "email", label: "Email", placeholder: "Email address" },
  { name: "state", label: "State", placeholder: "State" },
  { name: "lga", label: "LGA", placeholder: "Local government area" },
  { name: "address", label: "Residential Address", placeholder: "Residential address" }
];

const WITNESS_FIELDS = [
  { name: "fullName", label: "Full Name", placeholder: "Witness full name" },
  { name: "dob", label: "Date of Birth", placeholder: "YYYY-MM-DD", type: "date" },
  { name: "gender", label: "Gender", placeholder: "Gender" },
  { name: "phone", label: "Phone", placeholder: "Phone number" },
  { name: "nin", label: "NIN", placeholder: "National Identification Number" },
  { name: "email", label: "Email", placeholder: "Email address" }
];

const SECRETARY_FIELDS = [
  { name: "fullName", label: "Full Name", placeholder: "Secretary full name" },
  { name: "phone", label: "Phone", placeholder: "Phone number" },
  { name: "email", label: "Email", placeholder: "Email address" },
  { name: "nin", label: "NIN", placeholder: "National Identification Number" }
];

export default function CacServices() {
  const { user, refreshBalance } = useUser();
  const [service, setService] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState([]);
  const [prices, setPrices] = useState({ sole_proprietorship: 30000, partnership: 32000, limited_1m: 40000, custom_ngo: 0 });
  const [businessInfo, setBusinessInfo] = useState({ businessName1: "", businessName2: "", companyEmail: "", companyPhone: "", category: "", state: "", lga: "", shopNo: "", streetAddress: "" });
  const [proprietors, setProprietors] = useState([{ fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "" }]);
  const [witness, setWitness] = useState({ fullName: "", dob: "", gender: "", phone: "", nin: "", email: "" });
  const [includeSecretary, setIncludeSecretary] = useState(false);
  const [secretary, setSecretary] = useState({ fullName: "", phone: "", email: "", nin: "" });

  const currentPrice = prices[service] || 0;
  const showWitness = service !== "sole_proprietorship" && service !== "custom_ngo";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pricingRes, historyRes] = await Promise.all([
          api.get("/api/pricing"),
          user?.id ? api.get(`/api/cac/user-requests/${user.id}`) : Promise.resolve({ data: [] })
        ]);

        const pricing = pricingRes.data || {};
        if (pricing.cacServices) {
          setPrices({
            sole_proprietorship: pricing.cacServices.soleProprietorship || 30000,
            partnership: pricing.cacServices.partnership || 32000,
            limited_1m: pricing.cacServices.limited1M || 40000,
            custom_ngo: 0
          });
        }
        setHistory(historyRes.data || []);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const updateBusinessInfo = (field, value) => setBusinessInfo((prev) => ({ ...prev, [field]: value }));
  const updateProprietor = (index, field, value) => {
    setProprietors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addProprietor = () => setProprietors((prev) => [...prev, { fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "" }]);
  const removeProprietor = (index) => setProprietors((prev) => prev.filter((_, idx) => idx !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service) return;
    if (currentPrice > (user?.walletBalance || 0)) return alert("Insufficient wallet balance.");
    if (!agree) return alert("Please agree to the terms.");

    setSubmitting(true);
    try {
      const response = await api.post("/api/cac/submit", {
        serviceType: service,
        ...businessInfo,
        proprietors,
        witness: showWitness ? witness : undefined,
        secretary: includeSecretary ? secretary : undefined
      });
      // Instantly update wallet from API response (no extra fetch needed)
      if (response.data?.walletBalance !== undefined) {
        setBalance(response.data.walletBalance);
      }
      alert("✅ CAC registration submitted.");
      setService("");
      setProprietors([{ fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "" }]);
    } catch (err) {
      alert(err?.response?.data?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] text-gray-900 dark:text-gray-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-blue-500">Corporate service</p>
            <h1 className="text-4xl font-black">CAC Registry Services</h1>
          </div>
          <div className="rounded-3xl border bg-white/80 dark:bg-slate-950/80 p-5 shadow-2xl">
            <p className="text-sm text-slate-500">Wallet Balance</p>
            <p className="mt-2 text-3xl font-black">{formatNaira(user?.walletBalance || 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {SERVICE_OPTIONS.map((option) => (
            <motion.button key={option.key} type="button" onClick={() => setService(option.key)} whileHover={{ y: -2 }}
              className={`group rounded-3xl border p-6 text-left transition ${service === option.key ? "border-blue-500 bg-blue-500/10 shadow-xl" : "border-slate-200 bg-white dark:bg-slate-900"}`}
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white">{option.icon}</div>
              <h2 className="text-xl font-semibold">{option.title}</h2>
              <p className="mt-3 text-sm text-slate-500">{option.description}</p>
            </motion.button>
          ))}
        </div>

        {service && service !== "custom_ngo" && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="rounded-3xl border bg-white p-8 shadow-sm dark:bg-slate-950">
              <div className="flex justify-between pb-4 border-b">
                <h2 className="text-2xl font-bold">{SERVICE_OPTIONS.find((item) => item.key === service)?.title}</h2>
                <div className="font-bold text-blue-600">{formatNaira(currentPrice)}</div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {COMMON_FIELDS.map((field) => (
                  <label key={field.name} className="block">
                    <span className="text-sm font-semibold">{field.label}</span>
                    <input type={field.type || "text"} placeholder={field.placeholder} value={businessInfo[field.name]} onChange={(e) => updateBusinessInfo(field.name, e.target.value)} className="mt-2 w-full rounded-2xl border bg-slate-50 dark:bg-slate-900 px-4 py-3" />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-8 shadow-sm dark:bg-slate-950">
              <h2 className="text-2xl font-bold mb-6">Proprietor details</h2>
              {proprietors.map((owner, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-2 bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl mb-4">
                  {PROPRIETOR_FIELDS.map((field) => (
                    <input key={field.name} placeholder={field.label} value={owner[field.name]} onChange={(e) => updateProprietor(index, field.name, e.target.value)} className="w-full rounded-xl border p-3 dark:bg-slate-950" />
                  ))}
                </div>
              ))}
              <button type="button" onClick={addProprietor} className="text-blue-600 font-bold text-sm">+ Add Proprietor</button>
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-sm dark:bg-slate-950">
              <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Your data is secure</p>
                    <p className="text-xs text-blue-800">
                      All business and proprietor information is encrypted and handled in full compliance with NDPR regulations.
                      <Link to="/legal/security" className="text-blue-600 hover:underline ml-1">Security details</Link>
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5" />
                I authorize the wallet charge for this filing.
              </label>
              <button disabled={!agree || submitting} type="submit" className="mt-8 w-full bg-blue-600 text-white py-4 rounded-3xl font-bold">
                {submitting ? <Loader2 className="animate-spin" /> : "Submit CAC Filing"}
              </button>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}