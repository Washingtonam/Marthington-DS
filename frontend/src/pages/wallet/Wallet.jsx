import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import { Wallet2, Upload, ArrowRight, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePaystackPayment } from "react-paystack"; // Added

export default function Wallet() {
  const { user, setBalance } = useUser();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // manual bank transfer removed — payments handled via Paystack webhook

  // Paystack Configuration
  const initializePayment = async () => {
    if (!amount || Number(amount) < 100) return alert(`Minimum deposit is ₦100`);
    
    setLoading(true);
    try {
      const { data } = await api.post("/api/payments/init", { amount: Number(amount) });
      return {
        reference: data.reference,
        amount: Number(amount) * 100, // Paystack uses Kobo
        email: user.email,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      };
    } catch (err) {
      alert("Failed to initialize payment");
      setLoading(false);
      return null;
    }
  };

  const onSuccess = (reference) => {
    setLoading(false);
    alert("✅ Payment successful! Your wallet will update automatically.");
    // Force a balance refresh
    api.get("/api/users/wallet").then(res => setBalance(res.data.walletBalance));
  };

  const onClose = () => setLoading(false);

  const PaystackHook = () => {
    const [config, setConfig] = useState(null);
    const initializePaystack = usePaystackPayment(config || {});

    // When `config` is set, the hook returns a new `initializePaystack` bound to it.
    useEffect(() => {
      if (config) {
        initializePaystack(onSuccess, onClose);
      }
    }, [config]);

    const trigger = async () => {
      const paymentData = await initializePayment();
      if (paymentData) {
        setConfig(paymentData);
      }
    };

    return (
      <button onClick={trigger} disabled={loading} className="mt-6 w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700">
        {loading ? <Loader2 className="animate-spin" /> : "Pay with Paystack"}
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white p-8 rounded-[2rem] shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-4xl font-black">Wallet</h1>
          <p className="text-blue-100">Fund your account to access platform services</p>
        </div>
        <div className="bg-white/10 backdrop-blur p-6 rounded-3xl min-w-[200px] text-center">
          <p className="text-xs uppercase tracking-widest text-blue-200">Wallet Balance</p>
          <h2 className="text-5xl font-black">{formatNaira(user?.walletBalance ?? 0)}</h2>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] p-8 rounded-[2rem] shadow-xl border">
          <h2 className="text-2xl font-bold mb-6">Fund Wallet</h2>
          
          <input
            type="number"
            placeholder="Enter amount (₦)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-4 rounded-2xl border mb-6 bg-gray-50 dark:bg-gray-800"
          />

          <PaystackHook />

          <div className="mt-8 pt-8 border-t">
            <h3 className="font-bold mb-4">Funding Details</h3>
            <p className="text-sm text-gray-500">All automated funding is handled via Paystack and credited automatically after confirmation.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] p-8 rounded-[2rem] shadow-xl border text-sm space-y-4">
            <h3 className="font-bold">Automated Funding</h3>
            <p className="text-gray-500">Payments via Paystack are credited to your balance instantly upon confirmation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}