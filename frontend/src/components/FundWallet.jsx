import { useState, useCallback } from "react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import { Wallet, CreditCard, AlertCircle, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FundWallet Component
 * 
 * Provides automated Flutterwave wallet funding with:
 * - Real-time payment processing
 * - Automatic wallet credit on success
 * - Error handling and user feedback
 * - Responsive modal UI
 * 
 * Uses:
 * - Flutterwave inline checkout for payment modal
 * - UserContext for wallet state management
 * - ToastContext for notifications
 */
export default function FundWallet({ isOpen, onClose }) {
  // ========================================
  // STATE & CONTEXT
  // ========================================
  const { user, updateWalletBalance, apiUnits } = useUser();
  const { success, error: errorToast } = useToast();

  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [flutterwaveReference, setFlutterwaveReference] = useState("");

  // ========================================
  // ENVIRONMENT VARIABLES
  // ========================================
  const flutterwavePublicKey = import.meta.env.VITE_FLW_PUBLIC_KEY;

  if (!flutterwavePublicKey) {
    console.error("Missing VITE_FLW_PUBLIC_KEY environment variable");
  }

  // ========================================
  // VALIDATE AMOUNT
  // ========================================
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

  // ========================================
  // HANDLE PAYMENT SUCCESS
  // ========================================
  const handlePaymentSuccess = async () => {
    try {
      await apiUnits();
      success("✅ Payment successful! Your wallet has been updated automatically.");
      setAmount("");
      setPaymentInitiated(false);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error after payment success:", err);
      errorToast("Payment processed but failed to refresh wallet. Please refresh the page.");
    }
  };

  // ========================================
  // HANDLE PAYMENT ERROR
  // ========================================
  const handlePaymentError = (error) => {
    console.error("❌ Flutterwave payment error:", error);
    errorToast("Payment failed. Please try again.");
    setPaymentInitiated(false);
  };

  // ========================================
  // HANDLE CHECKOUT CLOSE
  // ========================================
  const handleCheckoutClose = () => {
    if (paymentInitiated) {
      errorToast("⚠️ Payment cancelled. Please try again.");
      setPaymentInitiated(false);
    }
  };

  // ========================================
  // HANDLE PAYMENT INITIALIZATION
  // ========================================
  const handlePayment = async () => {
    // Validate user is logged in
    if (!user?.id || !user?.email) {
      errorToast("Please log in to fund your wallet");
      return;
    }

    // Validate amount
    if (!validateAmount()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Call backend to create transaction and get reference
      console.log("📤 Initiating payment with backend...");

      const response = await api.post("/api/payments/init", {
        amount: Number(amount),
      });

      if (!response.data?.success || !response.data?.reference) {
        throw new Error("Failed to initialize payment");
      }

      const { reference } = response.data;
      console.log("✅ Payment initialized:", reference);
      setFlutterwaveReference(reference);

      if (!window?.FlutterwaveCheckout) {
        throw new Error("Flutterwave SDK is not loaded. Please refresh the page.");
      }

      const subaccountId = import.meta.env.VITE_FLW_OPAY_SUBACCOUNT_ID || import.meta.env.VITE_OPAY_SUBACCOUNT_ID;
      const paymentConfig = {
        public_key: flutterwavePublicKey,
        tx_ref: reference,
        amount: Number(amount),
        currency: "NGN",
        customer: {
          email: user.email,
        },
        customizations: {
          title: "Xcombinator Wallet Funding",
          description: "Fund your Xcombinator wallet",
        },
        callback: () => {
          success("✅ Payment successful! Your wallet has been updated automatically.");
          api.get("/api/users/wallet").then((res) => updateWalletBalance(res.data.walletBalance));
          setIsLoading(false);
          setPaymentInitiated(false);
        },
        onclose: () => {
          if (paymentInitiated) {
            errorToast("Payment cancelled. Please try again.");
          }
          setIsLoading(false);
          setPaymentInitiated(false);
        },
      };

      if (subaccountId) {
        paymentConfig.subaccounts = [
          {
            id: subaccountId,
            transaction_split_ratio: 1,
          },
        ];
      }

      setPaymentInitiated(true);
      window.FlutterwaveCheckout(paymentConfig);

    } catch (err) {
      console.error("Payment initialization error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to initialize payment";
      errorToast(errorMessage);
      setPaymentInitiated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // HANDLE QUICK AMOUNTS
  // ========================================
  const quickAmounts = [500, 1000, 2500, 5000];

  const setQuickAmount = (quickAmount) => {
    setAmount(String(quickAmount));
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
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

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Current Balance */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Current Wallet Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNaira(user?.walletBalance || 0)}
                  </p>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Fund
                  </label>
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

                {/* Quick Amount Buttons */}
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

                {/* Security Note */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Your payment is secured by Flutterwave. Your wallet will be updated automatically.
                  </p>
                </div>

                {/* Pay Button */}
                <button
                  onClick={handlePayment}
                  disabled={isLoading || !amount || !flutterwavePublicKey}
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

                {/* Info Text */}
                <p className="text-xs text-center text-gray-500">
                  By proceeding, you agree to Flutterwave's terms and our payment policies.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
