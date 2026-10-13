/**
 * EXAMPLE: Integrating FundWallet into Wallet.jsx
 * ===============================================
 * 
 * This shows how to add the new FundWallet modal to your existing Wallet page.
 * 
 * UPDATE: src/pages/wallet/Wallet.jsx
 */

import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import FundWallet from "../../components/FundWallet"; // ← NEW IMPORT
import { Wallet2, Upload, ArrowRight, Copy, CheckCircle2, Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function Wallet() {
  const { user, setBalance } = useUser();
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollMessage, setPollMessage] = useState("");
  const [fundWalletOpen, setFundWalletOpen] = useState(false); // ← NEW STATE

  const copyAccount = () => {
    navigator.clipboard.writeText("6104102697");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Image too large. Max 2MB.");

    const reader = new FileReader();
    reader.onloadend = () => setProof(reader.result);
    reader.readAsDataURL(file);
  };

  const submitPayment = async () => {
    if (!amount || Number(amount) < 100) return alert(`Minimum deposit is ₦100`);
    if (!proof) return alert("Please upload your payment screenshot");

    setLoading(true);
    try {
      await api.post("/api/finance/submit-payment", {
        amount: Number(amount),
        paymentMethod: "bank_transfer",
        proof,
      });

      alert("✅ Request submitted! Awaiting manual approval.");
      setAmount("");
      setProof(null);
    } catch (err) {
      alert(err.response?.data?.message || "Payment submission failed");
    } finally {
      setLoading(false);
    }
  };

  // ... rest of existing Wallet code ...

  return (
    <>
      {/* Existing wallet content */}
      <div className="space-y-6">
        
        {/* Wallet Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold opacity-90">Wallet Balance</h2>
            <Wallet2 className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-4xl font-bold mb-6">{formatNaira(user?.walletBalance || 0)}</p>
          
          {/* ← ADD THESE BUTTONS */}
          <div className="flex gap-3">
            <button
              onClick={() => setFundWalletOpen(true)} // ← OPEN FUNDWALLET MODAL
              className="flex-1 bg-white text-blue-600 font-semibold py-3 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Fund with Paystack
            </button>
            <button
              onClick={() => document.getElementById("bank-transfer-section").scrollIntoView({ behavior: "smooth" })}
              className="flex-1 bg-white/20 text-white font-semibold py-3 rounded-lg hover:bg-white/30 transition border border-white/30"
            >
              Bank Transfer
            </button>
          </div>
        </motion.div>

        {/* Rest of your existing wallet UI sections... */}

      </div>

      {/* NEW: FundWallet Modal Component */}
      <FundWallet 
        isOpen={fundWalletOpen} 
        onClose={() => setFundWalletOpen(false)} 
      />
    </>
  );
}

/**
 * KEY CHANGES:
 * 
 * 1. Import FundWallet component:
 *    import FundWallet from "../../components/FundWallet";
 * 
 * 2. Add state for modal:
 *    const [fundWalletOpen, setFundWalletOpen] = useState(false);
 * 
 * 3. Add button in wallet balance card:
 *    <button onClick={() => setFundWalletOpen(true)}>
 *      Fund with Paystack
 *    </button>
 * 
 * 4. Render the component:
 *    <FundWallet 
 *      isOpen={fundWalletOpen} 
 *      onClose={() => setFundWalletOpen(false)} 
 *    />
 * 
 * THAT'S IT! The rest of your existing wallet functionality remains unchanged.
 * 
 * The FundWallet component handles:
 * ✅ Payment modal UI
 * ✅ Amount input and validation
 * ✅ Paystack integration
 * ✅ Success/error handling
 * ✅ Wallet refresh on payment success
 * ✅ Toast notifications
 */
