import { useState } from "react";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import { Wallet2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Wallet() {
  const { user, setBalance } = useUser();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePayClick = async () => {
    const numAmount = Number(amount);

    if (!numAmount || numAmount < 100) {
      alert("Minimum deposit is ₦100");
      return;
    }

    if (!user?.email) {
      alert("Please log in to fund your wallet");
      return;
    }

    if (!window?.PaystackPop) {
      alert("Paystack SDK is not loaded. Please refresh the page.");
      return;
    }

    setLoading(true);

    try {
      console.log("📤 Initiating payment with backend...");
      const { data } = await api.post("/api/payments/init", { amount: numAmount });

      if (!data.reference) {
        throw new Error("Backend did not return a payment reference");
      }

      console.log("✅ Backend returned reference:", data.reference);

      const handler = new window.PaystackPop();
      handler.newTransaction({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: numAmount * 100,
        reference: data.reference,
        onSuccess: (transaction) => {
          console.log("✅ Paystack transaction successful:", transaction);
          setLoading(false);
          alert("✅ Payment successful! Your wallet will update automatically.");
          api.get("/api/users/wallet").then((res) => setBalance(res.data.walletBalance));
        },
        onCancel: () => {
          console.log("Paystack payment canceled by user.");
          setLoading(false);
        },
      });
    } catch (err) {
      console.error("❌ Payment initialization failed:", err);
      alert(`Error: ${err.response?.data?.message || err.message || "Payment initialization failed"}`);
      setLoading(false);
    }
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
            disabled={loading}
            className="w-full p-4 rounded-2xl border mb-6 bg-gray-50 dark:bg-gray-800 disabled:opacity-50"
          />

          <button
            onClick={handlePayClick}
            disabled={loading || !amount}
            className="mt-6 w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : (
              <>
                <Wallet2 size={20} />
                Pay with Paystack
              </>
            )}
          </button>

          <div className="mt-8 pt-8 border-t">
            <h3 className="font-bold mb-4">How It Works</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Enter amount and click "Pay with Paystack"</li>
              <li>✓ Complete payment in the Paystack modal</li>
              <li>✓ Your wallet updates automatically upon confirmation</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] p-8 rounded-[2rem] shadow-xl border text-sm space-y-4">
            <h3 className="font-bold">💡 Automated Funding</h3>
            <p className="text-gray-500">
              All payments via Paystack are processed securely and credited to your wallet instantly after confirmation. No additional steps required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}