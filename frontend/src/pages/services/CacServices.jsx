import { useState, useEffect } from "react";
import api from "../../lib/axios";
import { 
  Building2, UserPlus, Trash2, Upload, CheckCircle, 
  HelpCircle, Loader2, Users, Briefcase, Globe 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function CacServices() {
  const [service, setService] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Prices and Unit config
  const [prices, setPrices] = useState({ sole_proprietorship: 30000, partnership: 32000, limited_1m: 40000, custom_ngo: 0 });
  const [unitPrice, setUnitPrice] = useState(215);

  // Secure User ID retrieval
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user._id || user.id;

  const [businessInfo, setBusinessInfo] = useState({
    businessName1: "", businessName2: "", companyEmail: "", companyPhone: "",
    category: "", state: "", lga: "", shopNo: "", streetAddress: ""
  });

  const [proprietors, setProprietors] = useState([{ fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "", signature: "", passport: "" }]);
  const [witness, setWitness] = useState({ fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", signature: "", passport: "" });
  const [includeSecretary, setIncludeSecretary] = useState(false);
  const [secretary, setSecretary] = useState({ fullName: "", phone: "", email: "", nin: "" });

  const currentPrice = prices[service] || 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pricingPromise = api.get(`/api/pricing`);
      const historyPromise = userId ? api.get(`/api/cac/user-requests/${userId}`) : Promise.resolve({ data: [] });
      let pricingRes;
      let historyRes;

      try {
        [pricingRes, historyRes] = await Promise.all([pricingPromise, historyPromise]);
      } catch (err) {
        if (err?.response?.status === 404) {
          pricingRes = await pricingPromise;
          try {
            historyRes = await api.get(`/api/cac/history`);
          } catch (err2) {
            console.error("CAC history fallback failed:", err2);
            historyRes = { data: [] };
          }
        } else {
          console.error("Initialization error:", err);
          pricingRes = await pricingPromise.catch(() => ({ data: {} }));
          historyRes = { data: [] };
        }
      }

      if (pricingRes.data?.nin?.unitPrice) setUnitPrice(pricingRes.data.nin.unitPrice);
      if (pricingRes.data?.cacServices) {
          setPrices({
            sole_proprietorship: pricingRes.data.cacServices.soleProprietorship || 30000,
            partnership: pricingRes.data.cacServices.partnership || 32000,
            limited_1m: pricingRes.data.cacServices.limited1M || 40000,
            custom_ngo: 0
          });
        }
        setHistory(historyRes.data || []);
      } catch (err) { console.error("Initialization error:", err); }
      finally { setLoadingHistory(false); }
    };
    fetchData();
  }, [userId]);

  const handleFileChange = (e, index, field, type = "proprietor") => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("File too large (Max 2MB)");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      if (type === "proprietor") {
        const updated = [...proprietors];
        updated[index][field] = reader.result;
        setProprietors(updated);
      } else {
        setWitness(prev => ({ ...prev, [field]: reader.result }));
      }
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tokensRequired = Math.ceil(currentPrice / unitPrice);
    if (user.units < tokensRequired) return alert(`Insufficient balance. Need ${tokensRequired} units.`);

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/cac/submit`, {
        userId, serviceType: service, ...businessInfo, proprietors,
        ...(service === "limited_1m" ? { witness, secretary: includeSecretary ? secretary : null } : {})
      });
      alert("Registration submitted successfully!");
      setService("");
    } catch (err) { alert(err.response?.data?.message || "Submission failed."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-6 md:p-12 transition-colors">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-600"><Building2 size={32} /></div>
          <div>
            <h1 className="text-3xl font-black">CAC Registry Services</h1>
            <p className="text-gray-500">Professional corporate registration management</p>
          </div>
        </div>

        {/* Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { key: "sole_proprietorship", title: "Sole Proprietorship", icon: <Briefcase />, badge: "Business Name" },
            { key: "partnership", title: "Business Partnership", icon: <Users />, badge: "Partnership" },
            { key: "limited_1m", title: "LTD Company (1M)", icon: <Building2 />, badge: "LTD Company" },
            { key: "custom_ngo", title: "NGO & Custom", icon: <Globe />, badge: "Custom Setup" }
          ].map((card) => (
            <motion.div 
              whileHover={{ scale: 1.02 }}
              key={card.key}
              onClick={() => setService(card.key)}
              className={`p-6 rounded-3xl cursor-pointer border-2 transition-all ${service === card.key ? "bg-blue-600 text-white border-blue-600 shadow-2xl shadow-blue-500/20" : "bg-white dark:bg-[#121212] border-gray-100 dark:border-gray-800"}`}
            >
              <div className="mb-4">{card.icon}</div>
              <h3 className="font-bold text-lg">{card.title}</h3>
              <p className={`text-xs mt-2 ${service === card.key ? "text-blue-100" : "text-gray-400"}`}>{card.badge}</p>
            </motion.div>
          ))}
        </div>

        {/* Form Logic */}
        {service && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
            {service === "custom_ngo" ? (
              <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-3xl">
                <HelpCircle size={48} className="mx-auto text-blue-600 mb-4" />
                <h3 className="text-xl font-bold">Manual Verification Required</h3>
                <a href="https://wa.me/2348129097599" className="mt-6 inline-block bg-green-600 text-white px-8 py-3 rounded-full font-bold">Contact Support</a>
              </div>
            ) : (
              /* ... Insert your existing form fields here ... */
              <div className="p-8 bg-white dark:bg-[#121212] rounded-3xl border border-gray-100 dark:border-gray-800">
                <button disabled={submitting || !agree} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition flex justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" /> : "Submit Application"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}