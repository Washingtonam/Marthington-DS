import { useState, useEffect } from "react";
import api from "../../lib/axios";
import {
  Building2,
  Users,
  Briefcase,
  Globe,
  Loader2,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";

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

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user._id || user.id;
  const walletBalance = Number(user.walletBalance || 0);
  const currentPrice = prices[service] || 0;
  const showWitness = service !== "sole_proprietorship" && service !== "custom_ngo";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pricingRes, historyRes] = await Promise.all([
          api.get("/api/pricing"),
          userId ? api.get(`/api/cac/user-requests/${userId}`) : Promise.resolve({ data: [] })
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
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchData();
  }, [userId]);

  const updateBusinessInfo = (field, value) => {
    setBusinessInfo((prev) => ({ ...prev, [field]: value }));
  };

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
    if (currentPrice > walletBalance) {
      return alert(`Insufficient wallet balance. Deposit ₦${(currentPrice - walletBalance).toLocaleString()} to proceed.`);
    }
    if (!agree) return alert("Please agree to the terms before submitting.");

    setSubmitting(true);
    try {
      const payload = {
        serviceType: service,
        ...businessInfo,
        proprietors,
        witness: showWitness ? witness : undefined,
        secretary: includeSecretary ? secretary : undefined
      };

      await api.post("/api/cac/submit", payload);
      alert("CAC registration submitted. Check your dashboard for updates.");
      setService("");
      setAgree(false);
      setProprietors([{ fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "" }]);
      setWitness({ fullName: "", dob: "", gender: "", phone: "", nin: "", email: "" });
      setSecretary({ fullName: "", phone: "", email: "", nin: "" });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] text-gray-900 dark:text-gray-100 p-6 md:p-12 transition-colors">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-blue-500">Corporate service</p>
            <h1 className="text-4xl font-black">CAC Registry Services</h1>
            <p className="mt-3 max-w-2xl text-gray-600 dark:text-gray-400">Submit pre-priced company filings instantly with wallet-backed payment and a clean request engine.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/80 dark:bg-slate-950/80 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-500 dark:text-slate-400">Current wallet balance</p>
            <p className="mt-2 text-3xl font-black">₦{walletBalance.toLocaleString()}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Selected service fee: ₦{currentPrice.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {SERVICE_OPTIONS.map((option) => (
            <motion.button
              key={option.key}
              type="button"
              onClick={() => setService(option.key)}
              whileHover={{ y: -2 }}
              className={`group rounded-3xl border p-6 text-left transition ${service === option.key ? "border-blue-500 bg-blue-500/10 shadow-xl" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white">{option.icon}</div>
              <h2 className="text-xl font-semibold">{option.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{option.description}</p>
            </motion.button>
          ))}
        </div>

        {service && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {service === "custom_ngo" ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-xl dark:border-slate-700 dark:bg-slate-950/90">
                <HelpCircle size={48} className="mx-auto text-blue-600" />
                <h2 className="mt-6 text-3xl font-bold">Custom CAC service</h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400">This service requires a specialist intake. Reach out to our advisory team for a tailored quote.</p>
                <a href="https://wa.me/2348129097599" className="mt-6 inline-flex items-center justify-center rounded-full bg-green-600 px-8 py-3 text-white shadow-lg">Contact Support</a>
              </div>
            ) : (
              <div className="grid gap-8">
                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Service summary</p>
                      <h2 className="text-2xl font-bold">{SERVICE_OPTIONS.find((item) => item.key === service)?.title}</h2>
                    </div>
                    <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">₦{currentPrice.toLocaleString()}</div>
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {COMMON_FIELDS.map((field) => (
                      <label key={field.name} className="block">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{field.label}</span>
                        <input
                          type={field.type || "text"}
                          placeholder={field.placeholder}
                          value={businessInfo[field.name]}
                          onChange={(e) => updateBusinessInfo(field.name, e.target.value)}
                          className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Proprietor profile</p>
                      <h2 className="text-2xl font-bold">Share owner details</h2>
                    </div>
                    <button type="button" onClick={addProprietor} className="rounded-full border border-blue-500 bg-blue-500/10 px-4 py-2 text-sm text-blue-700 transition hover:bg-blue-500/15 dark:text-blue-200">Add person</button>
                  </div>

                  <div className="mt-8 space-y-6">
                    {proprietors.map((owner, index) => (
                      <div key={index} className="rounded-3xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-4 mb-6">
                          <p className="font-semibold">Proprietor {index + 1}</p>
                          {proprietors.length > 1 && (
                            <button type="button" onClick={() => removeProprietor(index)} className="text-sm text-red-500">Remove</button>
                          )}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {PROPRIETOR_FIELDS.map((field) => (
                            <label key={field.name} className="block">
                              <span className="text-sm text-slate-700 dark:text-slate-200">{field.label}</span>
                              <input
                                type={field.type || "text"}
                                placeholder={field.placeholder}
                                value={owner[field.name]}
                                onChange={(e) => updateProprietor(index, field.name, e.target.value)}
                                className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {showWitness && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Witness details</p>
                        <h2 className="text-2xl font-bold">Add verification witness</h2>
                      </div>
                    </div>
                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      {WITNESS_FIELDS.map((field) => (
                        <label key={field.name} className="block">
                          <span className="text-sm text-slate-700 dark:text-slate-200">{field.label}</span>
                          <input
                            type={field.type || "text"}
                            placeholder={field.placeholder}
                            value={witness[field.name]}
                            onChange={(e) => setWitness((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                )}

                {showWitness && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Optional Secretary</p>
                        <h2 className="text-2xl font-bold">Corporate secretary</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncludeSecretary((prev) => !prev)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${includeSecretary ? "border-green-500 text-green-600" : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}
                      >
                        <ChevronDown size={16} className={includeSecretary ? "rotate-180" : ""} />
                        {includeSecretary ? "Included" : "Add Secretary"}
                      </button>
                    </div>
                    {includeSecretary && (
                      <div className="mt-8 grid gap-4 md:grid-cols-2">
                        {SECRETARY_FIELDS.map((field) => (
                          <label key={field.name} className="block">
                            <span className="text-sm text-slate-700 dark:text-slate-200">{field.label}</span>
                            <input
                              type={field.type || "text"}
                              placeholder={field.placeholder}
                              value={secretary[field.name]}
                              onChange={(e) => setSecretary((prev) => ({ ...prev, [field.name]: e.target.value }))}
                              className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    I confirm that the information above is accurate and authorize the wallet charge for this CAC filing.
                  </label>

                  <button disabled={!agree || submitting} type="submit" className="mt-8 inline-flex w-full items-center justify-center rounded-3xl bg-blue-600 px-6 py-4 text-white shadow-xl transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {submitting ? <Loader2 className="animate-spin" /> : "Submit CAC Filing"}
                  </button>
                </section>
              </div>
            )}
          </form>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Recent CAC submissions</p>
              <h2 className="text-2xl font-bold">Request history</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{history.length} entries</span>
          </div>

          {loadingHistory ? (
            <div className="mt-8 text-center text-slate-500">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="mt-8 text-center text-slate-500">No CAC requests found yet.</div>
          ) : (
            <div className="mt-8 space-y-4">
              {history.slice(0, 4).map((item) => (
                <div key={item._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{item.serviceType.replace(/_/g, " ")}</p>
                      <h3 className="text-lg font-semibold">₦{Number(item.amountCharged || 0).toLocaleString()}</h3>
                      <p className="text-sm text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
