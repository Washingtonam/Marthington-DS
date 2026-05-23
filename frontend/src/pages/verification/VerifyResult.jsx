import { useEffect, useState, useMemo } from "react";
import { Download, ShieldCheck, User, Phone, MapPin, Calendar, Fingerprint, Loader2, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyResult() {
  const [rawData, setRawData] = useState(null);
  const [loadingType, setLoadingType] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("nin_result");
    if (stored) {
      try {
        setRawData(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse result", err);
      }
    }
  }, []);

  const info = useMemo(() => {
    if (!rawData) return null;
    return rawData?.data?.data || rawData?.data || rawData;
  }, [rawData]);

  const downloadSlip = async (type) => {
    if (loadingType) return;
    setLoadingType(type);

    try {
      const res = await api("https://xcombinator.onrender.com/api/generate-nin-slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: info, type }),
      });

      if (!res.ok) throw new Error("Download request failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-slip.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoadingType(null);
    }
  };

  if (!info) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#111827] p-10 rounded-[2rem] shadow-xl text-center max-w-sm border">
          <Fingerprint size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold dark:text-white">No Result Found</h2>
          <p className="text-gray-500 mt-2">Please perform a new verification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-black">Verification Result</h1>
            <p className="text-blue-200">Identity verified successfully</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl px-6 py-4">
            <p className="text-xs text-blue-200 uppercase tracking-widest">NIN</p>
            <h2 className="text-2xl font-bold">{info.nin}</h2>
          </div>
        </div>
      </motion.div>

      {/* GRID */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-[#111827] p-8 rounded-[2rem] shadow-lg border flex flex-col items-center">
          {info.photo ? (
            <img src={`data:image/png;base64,${info.photo}`} alt="User" className="w-48 h-48 rounded-2xl object-cover border-4 border-blue-50" />
          ) : (
            <div className="w-48 h-48 rounded-2xl bg-gray-100 flex items-center justify-center"><User size={64} className="text-gray-400" /></div>
          )}
          <h2 className="text-xl font-bold mt-6 text-center">{`${info.firstname} ${info.surname}`}</h2>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-[#111827] p-8 rounded-[2rem] shadow-lg border">
          <div className="grid md:grid-cols-2 gap-4">
            {[ { icon: User, label: "Full Name", val: `${info.firstname} ${info.middlename || ""} ${info.surname}` },
               { icon: Calendar, label: "DOB", val: info.birthdate },
               { icon: Phone, label: "Phone", val: info.telephoneno || "N/A" },
               { icon: MapPin, label: "Address", val: info.residence_address || "N/A" }
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-[#0B1120] p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-blue-600 mb-1"><item.icon size={16} /> <span className="text-xs font-bold uppercase">{item.label}</span></div>
                <p className="font-semibold">{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DOWNLOADS */}
      <div className="mt-8 grid md:grid-cols-3 gap-5">
        {["data", "premium", "long"].map((type) => (
          <button 
            key={type} 
            onClick={() => downloadSlip(type)} 
            disabled={!!loadingType}
            className="bg-white dark:bg-[#111827] p-6 rounded-[2rem] border shadow hover:shadow-xl transition flex items-center justify-between"
          >
            <span className="font-bold capitalize">{type} Slip</span>
            {loadingType === type ? <Loader2 className="animate-spin" /> : <Download size={20} className="text-blue-600" />}
          </button>
        ))}
      </div>
    </div>
  );
}