import { useState } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import { Wallet, CreditCard, AlertCircle, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FundWallet({ isOpen, onClose }) {
  const { user, updateWalletBalance } = useUser();
  const { success, error: errorToast } = useToast();

  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateAmount = () => {
    const numAmount = Number(amount);

    if (!amount || numAmount <= 0) {
      errorToast("Please enter a valid amount");
      return false;
    }

    if (numAmount < 100) {
      errorToast("Minimum deposit is ₦100");
      return false;
    }

    if (numAmount > 5000000) {
      errorToast("Maximum deposit is ₦5,000,000");
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!user?.id || !user?.email) {
      errorToast("Please log in to fund your wallet");
      return;
    }

    if (!validateAmount()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/api/payments/init", { amount: Number(amount) });
      if (!response.data?.success || !response.data?.reference) {
        throw new Error("Failed to initialize payment");
      }

      const publicKey = import.meta.env.VITE_FLW_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("VITE_FLW_PUBLIC_KEY is not configured");
      }

      if (!window.FlutterwaveCheckout) {
        throw new Error("Flutterwave checkout is not loaded. Please refresh the page.");
      }

      window.FlutterwaveCheckout({
        public_key: publicKey,
        tx_ref: response.data.reference,
        amount: Number(amount),
        currency: "NGN",
        payment_options: "card,banktransfer,ussd",
        customer: {
          email: user.email,
          name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user.email,
        },
        customizations: {
          title: "Marthington Wallet Funding",
          description: "Top up your wallet",
          logo: "/logo.png",
        },
        callback: async () => {
          try {
            await api.post("/api/payments/verify", { reference: response.data.reference });
            const walletResponse = await api.get("/api/users/wallet");
            updateWalletBalance(walletResponse?.data?.walletBalance ?? 0);
            success("✅ Payment successful! Your wallet has been updated automatically.");
            setAmount("");
            setTimeout(() => onClose(), 1500);
          } catch (err) {
            console.error("Error after payment success:", err);
            errorToast("Payment processed but failed to refresh wallet. Please refresh the page.");
          } finally {
            setIsLoading(false);
          }
        },
        onclose: () => {
          setIsLoading(false);
        },
      });
    } catch (err) {
      console.error("Payment initialization error:", err);
      errorToast(err.response?.data?.message || err.message || "Failed to initialize payment");
      setIsLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2500, 5000];

  const setQuickAmount = (quickAmount) => {
    setAmount(String(quickAmount));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Fund Your Wallet</h2>
                    <p className="text-blue-100 text-sm">Instant payment via Flutterwave</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Current Wallet Balance</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNaira(user?.walletBalance || 0)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Fund</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-500 font-semibold text-lg">₦</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={isLoading}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Minimum: ₦100 | Maximum: ₦5,000,000</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Quick Amounts</p>
                  <div className="grid grid-cols-4 gap-2">
                    {quickAmounts.map((quickAmount) => (
                      <button
                        key={quickAmount}
                        onClick={() => setQuickAmount(quickAmount)}
                        disabled={isLoading}
                        className={`py-2 px-3 rounded-lg font-semibold text-sm transition ${
                          amount === String(quickAmount)
                            ? "bg-blue-600 text-white border-2 border-blue-600"
                            : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-blue-300 disabled:opacity-50"
                        }`}
                      >
                        ₦{(quickAmount / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">Your payment is secured by Flutterwave. Your wallet will be updated automatically.</p>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={isLoading || !amount}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Initializing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay with Flutterwave - {formatNaira(Number(amount) || 0)}
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-500">By proceeding, you agree to Flutterwave's terms and our payment policies.</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
