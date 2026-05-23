import { useEffect, useState } from "react";
import axios from "axios";
import {
  User, Phone, MapPin, CalendarDays, Upload, ShieldCheck, 
  CreditCard, Loader2, AlertCircle
} from "lucide-react";
import ModificationNoticeModal from "../../components/ModificationNoticeModal";

const API = "https://xcombinator.onrender.com";

export default function Modification() {
  const [pricing, setPricing] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({ email: "" });
  const [files, setFiles] = useState({ proof: null, passport: null });
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    axios.get(`${API}/api/pricing`)
      .then((res) => setPricing(res.data?.ninServices?.modification || {}))
      .catch((err) => console.error("Pricing fetch error:", err));

    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, []);

  const total = pricing?.[selectedType] || 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("File too large (max 2MB)");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => setFiles(prev => ({ ...prev, [type]: reader.result }));
  };

  const submit = async () => {
    if (!selectedType || !formData.nin) return alert("Please fill all required fields.");
    if (!files.proof || !files.passport) return alert("Please upload both Payment Receipt and Passport.");

    setLoading(true);
    try {
      await axios.post(`${API}/api/nin-services/request`, {
        userId: user?.id || user?._id,
        email: formData.email,
        service: "modification",
        type: selectedType,
        nin: formData.nin,
        slipType: "none",
        proof: files.proof,
        passport: files.passport,
        formData
      });

      alert("✅ Request submitted successfully!");
      setSelectedType(null);
      setFiles({ proof: null, passport: null });
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

      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-3xl p-10 text-white mb-8 shadow-xl">
        <h1 className="text-4xl font-black mb-2">Modify Your NIN Details</h1>
        <p className="opacity-80">Submit corrections securely and avoid rejection.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {services.map((s) => (
          <div key={s.key} onClick={() => setSelectedType(s.key)} 
            className={`cursor-pointer rounded-3xl border-2 p-6 transition-all ${selectedType === s.key ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-[#161616] border-transparent"}`}>
            <div className="text-blue-600 mb-4">{s.icon}</div>
            <h2 className="font-bold text-lg">{s.label}</h2>
            <p className="text-sm opacity-60 mb-4">{s.desc}</p>
            <p className="font-black text-xl">₦{pricing?.[s.key] || 0}</p>
          </div>
        ))}
      </div>

      {selectedType && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-[#161616] rounded-3xl p-8 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold">Applicant Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-[#202020]" placeholder="NIN" name="nin" onChange={(e) => handleChange({target: {name: 'nin', value: e.target.value.replace(/\D/g, '').slice(0, 11)}})} value={formData.nin || ""} />
              <input className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-[#202020]" placeholder="Surname" name="surname" onChange={handleChange} />
              <input className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-[#202020]" placeholder="First Name" name="firstname" onChange={handleChange} />
              <input className="w-full p-4 rounded-xl border bg-gray-50 dark:bg-[#202020]" placeholder="Middle Name" name="middlename" onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold mb-4">Payment Summary</h3>
              <h2 className="text-4xl font-black text-blue-600">₦{total.toLocaleString()}</h2>
              <div className="mt-4 text-xs space-y-1 opacity-70">
                <p>Bank: OPAY | Acct: 6104102697</p>
              </div>
            </div>
            
            <button onClick={submit} disabled={loading} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Processing..." : "Submit Application"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}