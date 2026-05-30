import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import {
  ShieldCheck,
  CreditCard,
  Loader2,
  FileText,
  BadgeCheck,
  Fingerprint,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatNaira } from "../../lib/currency";

export default function Validation() {
  const { user, units, refreshBalance } = useUser();
  const navigate = useNavigate();

  const [pricing, setPricing] = useState({});
  const [slipPrice, setSlipPrice] = useState(0);
  const [selectedService, setSelectedService] = useState(null);
  const [slip, setSlip] = useState("none");
  const [nin, setNin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data } = await api.get("/api/pricing");
        setPricing(data?.ninServices?.validation || {});
        setSlipPrice(data?.ninServices?.slipPrice || 150);
      } catch (err) {
        console.error("Error fetching pricing:", err);
      }
    };
    fetchPricing();
  }, []);

  const basePrice = pricing?.[selectedService] || 0;
  const extraSlip = slip === "none" ? 0 : slipPrice;
  const total = basePrice + extraSlip;

  const submit = async () => {
    if (!selectedService || !nin || nin.length !== 11) {
      return alert("Please select a service and enter a valid 11-digit NIN.");
    }

    if (total > (user?.walletBalance || 0)) {
      return alert("Insufficient wallet balance. Please fund your wallet.");
    }

    setLoading(true);
    try {
      await api.post("/api/nin-services/request", {
        userId: user?.id || user?._id,
        service: "validation",
        type: selectedService,
        nin,
        slipType: slip,
        amount: total,
      });

      await refreshBalance();
      alert("✅ Request submitted successfully. Wallet deducted.");
      navigate("/my-requests");
    } catch (err) {
      alert(err.response?.data?.message || "Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { key: "noRecord", label: "No Record" },
    { key: "updateRecord", label: "Update Record" },
    { key: "validateModification", label: "Validate Modification" },
    { key: "vnin", label: "V-NIN Validation" },
    { key: "photoError", label: "Photograph Error" },
    { key: "bypass", label: "Bypass NIN" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-8">
        <h1 className="text-4xl font-black">Validation Services</h1>
        <p className="text-white/70 mt-2">Secure identity validation deducted directly from your wallet.</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Fingerprint className="text-blue-600" /> Select Service</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {services.map((s) => (
                <button key={s.key} onClick={() => setSelectedService(s.key)} className={`p-5 rounded-3xl border transition-all ${selectedService === s.key ? "bg-blue-600 text-white border-blue-600 shadow-xl" : "bg-gray-50 dark:bg-[#0B1120] border-gray-100"}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{s.label}</span>
                    <span className="font-black">₦{pricing?.[s.key] || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border p-8">
            <h2 className="text-2xl font-bold mb-6">Verification Details</h2>
            <input type="number" placeholder="Enter 11-digit NIN" value={nin} onChange={(e) => setNin(e.target.value.slice(0, 11))} className="w-full bg-gray-50 p-5 rounded-2xl border outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="sticky top-5 bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><CreditCard className="text-blue-600" /> Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-gray-500"><span>Service Fee</span><span>{formatNaira(basePrice)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Slip Fee</span><span>{formatNaira(extraSlip)}</span></div>
              <div className="border-t pt-4 flex justify-between text-2xl font-black"><span>Total</span><span>{formatNaira(total)}</span></div>
            </div>
            <button onClick={submit} disabled={loading || !selectedService} className="w-full mt-8 bg-blue-600 text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition">
              {loading ? <Loader2 className="animate-spin" /> : <><BadgeCheck /> Submit Request</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}