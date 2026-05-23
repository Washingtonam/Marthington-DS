import { useEffect, useState } from "react";
import axios from "axios";
import {
  ShieldAlert,
  CreditCard,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const API = "https://xcombinator.onrender.com";

export default function IPEClearance() {
  const [pricing, setPricing] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [nin, setNin] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch Pricing
  useEffect(() => {
    axios.get(`${API}/api/pricing`)
      .then((res) => setPricing(res.data?.ninServices?.ipe || {}))
      .catch((err) => console.error("Failed to load pricing", err));
  }, []);

  const total = pricing?.[selectedType] || 0;

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("File too large (max 2MB)");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => setProof(reader.result);
  };

  const submit = async () => {
    if (!selectedType || nin.length !== 11) return alert("Please select a service and enter a valid 11-digit NIN.");
    if (!proof) return alert("Please upload your payment receipt.");

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.post(`${API}/api/nin-services/request`, {
        userId: user?.id,
        service: "ipe",
        type: selectedType,
        nin,
        slipType: "none",
        proof,
      });

      alert("✅ Request submitted successfully!");
      setSelectedType(null);
      setNin("");
      setProof(null);
    } catch (err) {
      alert(err.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { key: "inProcessingError", label: "In Processing Error", desc: "Fix records stuck during processing", icon: <AlertCircle size={24} /> },
    { key: "stillProcessing", label: "Still Processing", desc: "Resolve prolonged delays", icon: <ShieldAlert size={24} /> },
    { key: "newEnrollment", label: "New Enrollment", desc: "Tracking ID enrollment issues", icon: <CheckCircle2 size={24} /> },
    { key: "invalidTracking", label: "Invalid Tracking ID", desc: "Correct invalid tracking", icon: <AlertCircle size={24} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-in fade-in duration-500">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white rounded-3xl p-10 shadow-xl mb-8">
        <h1 className="text-4xl font-black mb-2">Resolve NIN Issues</h1>
        <p className="opacity-80">Professional clearance for processing and enrollment errors.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Service Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {services.map((s) => (
              <div
                key={s.key}
                onClick={() => setSelectedType(s.key)}
                className={`cursor-pointer rounded-3xl border-2 p-6 transition-all ${selectedType === s.key ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-[#161616] border-transparent"}`}
              >
                <div className="text-blue-600 mb-2">{s.icon}</div>
                <h2 className="font-bold text-lg">{s.label}</h2>
                <p className="text-sm opacity-60">{s.desc}</p>
                <p className="mt-4 font-black text-xl">₦{pricing?.[s.key] || 0}</p>
              </div>
            ))}
          </div>

          {/* Form Inputs */}
          <div className="bg-white dark:bg-[#161616] p-8 rounded-3xl shadow-sm">
            <input 
              className="w-full p-4 rounded-xl border mb-4 bg-gray-50 dark:bg-[#202020]" 
              placeholder="Enter 11-digit NIN" 
              value={nin} 
              onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))} 
            />
            <input type="file" onChange={handleFile} className="w-full p-4 border rounded-xl" />
          </div>
        </div>

        {/* Payment Sidebar */}
        <div className="bg-white dark:bg-[#161616] p-8 rounded-3xl shadow-xl h-fit sticky top-6">
          <h3 className="font-bold text-xl mb-6">Payment Details</h3>
          <div className="bg-blue-600 text-white p-6 rounded-2xl mb-6">
            <p className="text-xs opacity-80 uppercase">Total Amount</p>
            <h2 className="text-4xl font-black">₦{total.toLocaleString()}</h2>
          </div>
          <div className="text-sm space-y-2 mb-8">
            <p><b>Bank:</b> OPAY</p>
            <p><b>Account:</b> 6104102697</p>
            <p><b>Name:</b> WASHINGTON AMEDU</p>
          </div>
          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" />}
            {loading ? "Processing..." : "Submit Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}