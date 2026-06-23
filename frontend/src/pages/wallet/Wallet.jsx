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

  const handlePaystackPayment = async () => {
    const numAmount = Number(amount);

    if (!numAmount || numAmount < 100) {
      alert("Minimum deposit is ₦100");
      return;
    }

    if (!user?.email) {
      alert("Please log in to fund your wallet");
      return;
    }

    setLoading(true);

    try {
      console.log("📤 Initiating payment with backend...");
      const { data } = await api.post("/api/payments/init", {
        amount: numAmount,
      });

      if (!data.reference) {
        throw new Error("Backend did not return a payment reference");
      }

      console.log("✅ Payment reference received:", data.reference);
      console.log("🔗 Opening Paystack checkout...");

      // Initialize Paystack payment
      const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!paystackPublicKey) {
        throw new Error("VITE_PAYSTACK_PUBLIC_KEY is not configured");
      }

      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: user.email,
        amount: numAmount * 100, // Paystack expects amount in kobo
        ref: data.reference,
        onClose: function () {
          console.log("⚠️  Payment window closed");
          alert("Payment window closed");
          setLoading(false);
        },
        onSuccess: function (response) {
          console.log("✅ Paystack payment successful!");
          console.log("   Reference:", response.reference);
          console.log("   Status:", response.status);
          
          // Refresh wallet balance
          api.get("/api/users/wallet")
            .then((res) => {
              setBalance(res.data.walletBalance);
              alert("✅ Payment successful! Your wallet has been updated.");
            })
            .catch((err) => {
              console.error("Error fetching updated wallet:", err);
              alert("✅ Payment successful! Please refresh to see updated balance.");
            });
          
          setLoading(false);
          setAmount("");
        },
      });

      handler.openIframe();
    } catch (err) {
      console.error("❌ Payment initialization failed:", err);
      alert("Error: " + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#0f172a] dark:to-[#1e293b]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Wallet Info */}
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            <h1 className="text-3xl font-bold mb-2">Your Wallet</h1>
            <p className="text-gray-500 mb-8">Manage your account balance</p>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
              <p className="text-sm opacity-80 mb-2">Current Balance</p>
              <h2 className="text-4xl font-bold">{formatNaira(user?.walletBalance || 0)}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Amount to Deposit</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount in ₦"
                  className="w-full mt-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-[#0f172a] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="100"
                  max="5000000"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {[500, 1000, 2500, 5000].map((quick) => (
                  <button
                    key={quick}
                    onClick={() => setAmount(String(quick))}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-medium"
                  >
                    ₦{quick.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePaystackPayment}
                disabled={loading || !amount}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
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
          </div>

          {/* Information */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] shadow-xl border text-sm space-y-4">
              <h3 className="font-bold">💡 Automated Funding</h3>
              <p className="text-gray-500">
                All payments via Paystack are processed securely and credited to your wallet instantly after confirmation. No additional steps required.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] shadow-xl border text-sm space-y-4">
              <h3 className="font-bold">🔒 Secure Transactions</h3>
              <p className="text-gray-500">
                Your payment information is processed securely by Paystack, a leading payment provider trusted by thousands of businesses.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] shadow-xl border text-sm space-y-4">
              <h3 className="font-bold">⚡ Instant Credits</h3>
              <p className="text-gray-500">
                Payments are verified and your wallet is credited within seconds. Use your balance immediately for services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
