import { useState, useEffect } from "react";

import { useUser } from "../../context/UserContext";
import api from "../lib/axios";
import {
  Wallet2,
  CreditCard,
  Upload,
  ShieldCheck,
  ArrowRight,
  BadgeCheck,
  Copy,
  CheckCircle2,
} from "lucide-react";

import { motion } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function Wallet() {

  const { user, units } = useUser();

  const [amount, setAmount] = useState("");

  const [proof, setProof] = useState(null);

  const [loading, setLoading] = useState(false);

  const [unitPrice, setUnitPrice] = useState(250);

  const [uploaded, setUploaded] = useState(false);

  const [copied, setCopied] = useState(false);

  // =========================
  // FETCH PRICING
  // =========================
  useEffect(() => {

    const fetchPricing = async () => {

      try {

        const res = await fetch(
          `${API_BASE}/api/pricing`
        );

        const data = await res.json();

        setUnitPrice(
          data?.nin?.unitPrice || 250
        );

      } catch (err) {

        console.error(
          "Pricing fetch error:",
          err
        );
      }
    };

    fetchPricing();

  }, []);

  // =========================
  // CALCULATE UNITS
  // =========================
  const calculatedUnits =
    Math.floor(Number(amount) / unitPrice);

  // =========================
  // HANDLE FILE
  // =========================
  const handleFile = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    // LIMIT
    if (file.size > 2 * 1024 * 1024) {

      alert("Image too large. Max 2MB.");

      return;
    }

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onloadend = () => {

      setProof(reader.result);

      setUploaded(true);
    };
  };

  // =========================
  // COPY ACCOUNT NUMBER
  // =========================
  const copyAccount = async () => {

    try {

      await navigator.clipboard.writeText(
        "6104102697"
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);

    } catch {

      alert("Copy failed");
    }
  };

  // =========================
  // SUBMIT PAYMENT
  // =========================
  const submitPayment = async () => {

    if (!user?.id) {
      return alert("User not logged in");
    }

    if (!amount || Number(amount) <= 0) {
      return alert("Enter a valid amount");
    }

    if (!proof) {
      return alert("Upload payment proof");
    }

    if (calculatedUnits < 1) {
      return alert(
        `Minimum is ₦${unitPrice} (1 unit)`
      );
    }

    setLoading(true);

    try {

      const res = await fetch(
        `${API_BASE}/api/submit-payment`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId: user.id,
            amount: Number(amount),
            units: calculatedUnits,
            proof,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {

        throw new Error(
          data.message || "Payment failed"
        );
      }

      alert(
        `✅ Submitted! You’ll receive ${calculatedUnits} units after approval`
      );

      // RESET
      setAmount("");

      setProof(null);

      setUploaded(false);

    } catch (error) {

      alert(
        error.message || "Submission failed"
      );
    }

    setLoading(false);
  };

  return (

    <div className="max-w-6xl mx-auto">

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}

        animate={{
          opacity: 1,
          y: 0,
        }}

        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-8 md:p-10 shadow-2xl mb-8"
      >

        {/* BG */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">

          {/* LEFT */}
          <div>

            <div className="flex items-center gap-4 mb-5">

              <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center">

                <Wallet2 size={34} />

              </div>

              <div>

                <h1 className="text-4xl font-black">
                  Wallet
                </h1>

                <p className="text-white/70 mt-1">
                  Fund your account and purchase units
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl px-5 py-4 w-fit">

              <ShieldCheck size={18} />

              <p className="text-sm">
                Payments are manually verified for security
              </p>

            </div>

          </div>

          {/* RIGHT */}
          <div className="bg-white/10 border border-white/10 backdrop-blur rounded-3xl p-6 min-w-[220px]">

            <p className="text-sm text-white/60 mb-2">
              Available Units
            </p>

            <h2 className="text-5xl font-black">
              {units}
            </h2>

          </div>

        </div>

      </motion.div>

      {/* ========================= */}
      {/* GRID */}
      {/* ========================= */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2">

          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">

            {/* HEADER */}
            <div className="flex items-center gap-4 mb-8">

              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">

                <CreditCard
                  size={28}
                  className="text-blue-600"
                />

              </div>

              <div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Manual Bank Transfer
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Make transfer and upload payment proof
                </p>

              </div>

            </div>

            {/* BANK CARD */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white rounded-[2rem] p-7 mb-8 relative overflow-hidden shadow-2xl">

              <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-3xl" />

              <div className="relative z-10">

                <p className="text-white/60 text-sm mb-2">
                  Bank Name
                </p>

                <h3 className="text-2xl font-black mb-6">
                  OPAY
                </h3>

                <p className="text-white/60 text-sm">
                  Account Number
                </p>

                <div className="flex items-center gap-3 mt-1 mb-6">

                  <h2 className="text-4xl font-black tracking-widest">
                    6104102697
                  </h2>

                  <button
                    onClick={copyAccount}
                    className="bg-white/10 hover:bg-white/20 transition p-2 rounded-xl"
                  >

                    {copied
                      ? <CheckCircle2 size={18} />
                      : <Copy size={18} />
                    }

                  </button>

                </div>

                <p className="text-white/60 text-sm">
                  Account Name
                </p>

                <h3 className="text-xl font-bold mt-1">
                  WASHINGTON AMEDU
                </h3>

              </div>

            </div>

            {/* AMOUNT */}
            <div className="mb-6">

              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Amount
              </label>

              <input
                type="number"
                placeholder="Enter amount in naira"

                value={amount}

                onChange={(e) =>
                  setAmount(e.target.value)
                }

                className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            {/* CALCULATOR */}
            {amount && (

              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5 mb-6">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Conversion Preview
                    </p>

                    <h3 className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-2">

                      {calculatedUnits} Units

                    </h3>

                  </div>

                  <div className="text-right">

                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ₦{amount} ÷ ₦{unitPrice}
                    </p>

                  </div>

                </div>

              </div>

            )}

            {/* FILE UPLOAD */}
            <div className="mb-8">

              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                Upload Payment Proof
              </label>

              <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition bg-gray-50 dark:bg-[#0B1120]">

                <Upload
                  size={40}
                  className="text-gray-400 mb-4"
                />

                <p className="font-medium text-gray-700 dark:text-gray-300">
                  Click to upload screenshot
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Maximum upload size: 2MB
                </p>

                <input
                  type="file"
                  onChange={handleFile}
                  className="hidden"
                />

              </label>

              {uploaded && (

                <div className="mt-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-2xl p-4">

                  <p className="text-green-700 dark:text-green-300 text-sm font-medium">

                    ✅ Payment proof uploaded successfully

                  </p>

                </div>

              )}

            </div>

            {/* BUTTON */}
            <button
              onClick={submitPayment}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-semibold text-white shadow-xl transition flex items-center justify-center gap-2 ${
                loading
                  ? "bg-gray-400"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90"
              }`}
            >

              {loading
                ? "Submitting..."
                : (
                  <>
                    Submit Payment
                    <ArrowRight size={18} />
                  </>
                )
              }

            </button>

          </div>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* UNIT PRICE */}
          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6">

            <div className="flex items-center gap-4 mb-4">

              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">

                <BadgeCheck
                  size={26}
                  className="text-blue-600"
                />

              </div>

              <div>

                <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                  Unit Pricing
                </h2>

                <p className="text-sm text-gray-500">
                  Current verification pricing
                </p>

              </div>

            </div>

            <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-5">

              <p className="text-sm text-gray-500">
                Price Per Unit
              </p>

              <h2 className="text-4xl font-black text-blue-600 mt-2">
                ₦{unitPrice}
              </h2>

            </div>

          </div>

          {/* INFO */}
          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6">

            <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-5">
              Important Notice
            </h2>

            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">

              <div className="flex gap-3">

                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />

                <p>
                  Payments are manually reviewed before units are credited.
                </p>

              </div>

              <div className="flex gap-3">

                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />

                <p>
                  Upload clear payment screenshots for faster approval.
                </p>

              </div>

              <div className="flex gap-3">

                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />

                <p>
                  Incorrect payment proof may delay processing.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}