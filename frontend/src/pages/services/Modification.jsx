import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import {
  User, Phone, MapPin, CalendarDays, Loader2, Wallet, BadgeCheck
} from "lucide-react";
import { formatNaira } from "../../lib/currency";
import ModificationNoticeModal from "../../components/ModificationNoticeModal";

export default function Modification() {
  const navigate = useNavigate();
  const { user, refreshBalance } = useUser();
  const [pricing, setPricing] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({ nin: "", surname: "", firstname: "", middlename: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data } = await api.get("/api/pricing");
        setPricing(data?.ninServices?.modification || {});
      } catch (err) { console.error("Pricing fetch error:", err); }
    };
    fetchPricing();
  }, []);

  const total = pricing?.[selectedType] || 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async () => {
    if (!selectedType || !formData.nin) return alert("Please fill all required fields.");
    if (total > (user?.walletBalance || 0)) return alert("Insufficient wallet balance. Please fund your wallet.");

    setLoading(true);
    try {
      await api.post("/api/services/request", {
        service: "modification",
        type: selectedType,
        nin: formData.nin,
        formData
      });

      await refreshBalance();
      alert("✅ Modification request submitted successfully!");
      navigate("/my-requests");
    } catch (err) {
      alert(err.response?.data?.message || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { key: "name", label: "Name Modification", desc: "Correct name/spelling errors", icon: <User size={24} /> },
    { key: "phone", label: "Phone Number", desc: "Update linked phone number", icon: <Phone size={24} /> },
    { key: "address", label: "Address Correction", desc: "Fix residential address records", icon: <MapPin size={24} /> },
    { key: "dob", label: "Date Of Birth", desc: "Correct DOB information", icon: <CalendarDays size={24} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-in fade-in duration-500">
      <ModificationNoticeModal />

      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-[2rem] p-10 text-white mb-8 shadow-2xl">
        <h1 className="text-4xl font-black mb-2">Modify Your NIN Details</h1>
        <p className="opacity-80">Secure, wallet-integrated data corrections.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {services.map((s) => (
          <button key={s.key} onClick={() => setSelectedType(s.key)} 
            className={`text-left rounded-3xl border-2 p-6 transition-all ${selectedType === s.key ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-[#111827] border-transparent shadow-sm"}`}>
            <div className="text-blue-600 mb-4">{s.icon}</div>
            <h2 className="font-bold text-lg dark:text-white">{s.label}</h2>
            <p className="text-sm opacity-60 mb-4 dark:text-gray-400">{s.desc}</p>
            <p className="font-black text-xl dark:text-white">{formatNaira(pricing?.[s.key] || 0)}</p>
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-[2rem] p-8 shadow-sm border space-y-6">
            <h2 className="text-2xl font-bold dark:text-white">Applicant Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-[#0B1120] dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="NIN" name="nin" onChange={(e) => handleChange({target: {name: 'nin', value: e.target.value.replace(/\D/g, '').slice(0, 11)}})} value={formData.nin} />
              <input className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-[#0B1120] dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Surname" name="surname" onChange={handleChange} />
              <input className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-[#0B1120] dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="First Name" name="firstname" onChange={handleChange} />
              <input className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-[#0B1120] dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Middle Name" name="middlename" onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#111827] rounded-[2rem] p-8 shadow-xl border">
              <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Wallet className="text-blue-600" /> Payment Summary</h3>
              <h2 className="text-4xl font-black text-blue-600">{formatNaira(total)}</h2>
            </div>
            
            <button onClick={submit} disabled={loading} className="w-full py-5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition">
              {loading ? <Loader2 className="animate-spin" /> : <><BadgeCheck size={20} /> Submit Application</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}