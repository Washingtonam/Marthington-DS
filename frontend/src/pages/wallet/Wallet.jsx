import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import { Wallet2, Upload, ArrowRight, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Wallet() {
  const { user, setBalance } = useUser();
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pollMessage, setPollMessage] = useState("");

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

  const startPaystackTopup = async () => {
    if (!amount || Number(amount) < 100) return alert(`Minimum deposit is ₦100`);

    setLoading(true);
    try {
      const { data } = await api.post("/api/finance/initiate-paystack", {
        amount: Number(amount),
      });

      if (!data?.authorizationUrl) {
        throw new Error("Unable to initialize Paystack checkout.");
      }

      window.location.href = data.authorizationUrl;
    } catch (err) {
      console.error("Paystack checkout error:", err);
      alert(err.response?.data?.message || err.message || "Unable to start Paystack checkout.");
    } finally {
      setLoading(false);
    }
  };

  const clearPaystackQuery = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("paystack");
    window.history.replaceState(null, "", url.toString());
  };

  const pollForWebhookUpdate = async (initialBalance) => {
    setIsPolling(true);
    setPollMessage("Waiting for payment confirmation...");

    const MAX_ATTEMPTS = 10;
    const POLL_DELAY_MS = 3000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await api.get("/api/users/wallet");
        const latestBalance = response.data?.walletBalance;

        if (typeof latestBalance === "number") {
          setBalance(latestBalance);
          if (latestBalance !== initialBalance) {
            setPollMessage("Payment confirmed — wallet balance updated.");
            clearPaystackQuery();
            setIsPolling(false);
            return;
          }
        }
      } catch (err) {
        console.error("Wallet polling error:", err);
      }

      setPollMessage(`Waiting for payment confirmation... (${attempt}/${MAX_ATTEMPTS})`);
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
    }

    setPollMessage("Still waiting for Paystack confirmation. Refresh this page in a few seconds.");
    setIsPolling(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paystack") !== "success" || !user) return;

    const currentBalance = user.walletBalance ?? 0;
    setPollMessage("Checking payment status...");
    setLoading(true);

    const initPolling = async () => {
      await pollForWebhookUpdate(currentBalance);
      setLoading(false);
    };

    initPolling();
  }, [user]);

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
          <h2 className="text-2xl font-bold mb-6">Manual Bank Transfer</h2>
          <div className="bg-slate-900 text-white p-6 rounded-2xl mb-6 shadow-lg">
            <p className="text-slate-400 text-sm">Account Details</p>
            <div className="flex justify-between items-center mt-2">
              <h3 className="text-2xl font-bold tracking-widest">6104102697</h3>
              <button onClick={copyAccount} className="p-2 bg-white/10 rounded-lg">{copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}</button>
            </div>
            <p className="mt-4 font-semibold">WASHINGTON AMEDU (OPAY)</p>
          </div>

          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-2xl mb-6 shadow-lg">
            <p className="text-sm uppercase tracking-widest text-emerald-100">Instant Top-up</p>
            <p className="mt-2 text-sm text-white/90">Use Paystack to fund your wallet instantly. Your balance will update automatically after payment confirmation.</p>
            <button
              onClick={startPaystackTopup}
              disabled={loading}
              className="mt-6 w-full bg-white text-slate-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Pay with Paystack"}
            </button>
            {pollMessage && (
              <div className="mt-4 rounded-2xl bg-white/10 border border-white/20 p-4 text-sm text-white">
                {pollMessage}
              </div>
            )}
          </div>

          <input
            type="number"
            placeholder="Enter amount (₦)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-4 rounded-2xl border mb-4 bg-gray-50 dark:bg-gray-800"
          />
          
          <label className="border-2 border-dashed p-8 rounded-2xl flex flex-col items-center cursor-pointer hover:bg-gray-50 transition">
            <Upload className="text-blue-500 mb-2" />
            <span className="font-semibold">{proof ? "Proof Selected" : "Upload Payment Screenshot"}</span>
            <input type="file" onChange={handleFile} className="hidden" />
          </label>

          <button onClick={submitPayment} disabled={loading} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700">
            {loading ? <Loader2 className="animate-spin" /> : <>Submit Payment <ArrowRight size={18} /></>}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] p-8 rounded-[2rem] shadow-xl border text-sm space-y-4">
            <h3 className="font-bold">Important Notice</h3>
            <ul className="text-gray-500 space-y-2">
              <li>• Payments require manual review.</li>
              <li>• Only upload clear transfer receipts.</li>
              <li>• Balance reflects once approved.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}