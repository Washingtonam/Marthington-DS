import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import { Loader2, ShieldCheck, CreditCard, User } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyBVN() {
  const [bvn, setBvn] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [price, setPrice] = useState(0);

  const { user, balance, setBalance } = useUser();

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await api("https://xcombinator.onrender.com/api/pricing");
        const data = await res;
        setPrice(data?.bvn?.price || 0);
      } catch (err) {
        console.error("Failed to load pricing", err);
      }
    };
    fetchPricing();
  }, []);

  const handleVerify = async () => {
    if (bvn.length !== 11) return alert("BVN must be exactly 11 digits");
    if (balance < price) return alert(`Insufficient balance. Required: ₦${price}`);

    setLoading(true);
    setResult(null);

    try {
      const res = await api("https://xcombinator.onrender.com/api/verify-bvn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bvn, userId: user?.id }),
      });

      const data = await res;
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setResult(data);
      setBalance(data.balance);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const info = result?.data?.data || result?.data || null;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-black mb-2">BVN Verification</h1>
      <p className="text-gray-500 mb-8">Verify identity details securely.</p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-600 text-white p-6 rounded-3xl">
          <p className="text-blue-100 text-sm">Available Balance</p>
          <h2 className="text-3xl font-bold">{formatNaira(balance ?? 0)}</h2>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-3xl">
          <p className="text-gray-500 text-sm">Service Cost</p>
          <h2 className="text-3xl font-bold dark:text-white">{formatNaira(price)}</h2>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] p-8 rounded-[2rem] border shadow-xl">
        <input
          type="number"
          placeholder="Enter 11-digit BVN"
          value={bvn}
          onChange={(e) => setBvn(e.target.value.slice(0, 11))}
          className="w-full bg-gray-50 dark:bg-[#0B1120] border p-5 rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          {loading ? "Verifying..." : `Verify BVN (${formatNaira(price)})`}
        </button>
      </div>

      {info && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-white dark:bg-[#111827] p-8 rounded-[2rem] border shadow-xl">
          <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
            <User className="text-blue-600" /> Result Details
          </h2>
          <div className="space-y-4">
            {Object.entries({ Name: `${info.firstname} ${info.lastname}`, Phone: info.phone, DOB: info.dob, BVN: info.bvn }).map(([key, val]) => (
              <div key={key} className="flex justify-between border-b dark:border-gray-800 pb-2">
                <span className="text-gray-500">{key}</span>
                <span className="font-semibold dark:text-white">{val || "N/A"}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}