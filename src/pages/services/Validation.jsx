import { useEffect, useState } from "react";
import api from "../lib/axios";
import {
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Upload,
  Loader2,
  FileText,
  BadgeCheck,
  Fingerprint,
} from "lucide-react";

import { motion } from "framer-motion";

const API = "https://xcombinator.onrender.com";

export default function Validation() {

  const [pricing, setPricing] = useState({});

  const [slipPrice, setSlipPrice] = useState(150);

  const [selectedService, setSelectedService] = useState(null);

  const [slip, setSlip] = useState("none");

  const [nin, setNin] = useState("");

  const [proof, setProof] = useState(null);

  const [loading, setLoading] = useState(false);

  // =========================
  // FETCH PRICING
  // =========================
  useEffect(() => {

    fetch(`${API}/api/pricing`)
      .then((res) => res.json())
      .then((data) => {

        setPricing(
          data?.ninServices?.validation || {}
        );

        setSlipPrice(
          data?.ninServices?.slipPrice || 150
        );
      });

  }, []);

  // =========================
  // CALCULATE
  // =========================
  const basePrice =
    pricing?.[selectedService] || 0;

  const extraSlip =
    slip === "none"
      ? 0
      : slipPrice;

  const total =
    basePrice + extraSlip;

  // =========================
  // FILE
  // =========================
  const handleFile = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {

      return alert(
        "File too large (max 2MB)"
      );
    }

    const reader =
      new FileReader();

    reader.readAsDataURL(file);

    reader.onloadend = () => {

      setProof(reader.result);
    };
  };

  // =========================
  // SUBMIT
  // =========================
  const submit = async () => {

    if (!selectedService || !nin) {

      return alert(
        "Select service and enter NIN"
      );
    }

    if (!proof) {

      return alert(
        "Upload payment proof"
      );
    }

    setLoading(true);

    try {

      const res = await fetch(
        `${API}/api/nin-services/request`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId:
              JSON.parse(
                localStorage.getItem("user")
              ).id,

            service: "validation",

            type: selectedService,

            nin,

            slipType: slip,

            proof,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok)
        throw new Error(
          data.message
        );

      alert(
        "✅ Payment submitted successfully"
      );

      // RESET
      setSelectedService(null);

      setSlip("none");

      setNin("");

      setProof(null);

    } catch (err) {

      alert(err.message);
    }

    setLoading(false);
  };

  // =========================
  // SERVICES
  // =========================
  const services = [

    {
      key: "noRecord",
      label: "No Record",
    },

    {
      key: "updateRecord",
      label: "Update Record",
    },

    {
      key: "validateModification",
      label: "Validate Modification",
    },

    {
      key: "vnin",
      label: "V-NIN Validation",
    },

    {
      key: "photoError",
      label: "Photograph Error",
    },

    {
      key: "bypass",
      label: "Bypass NIN",
    },

  ];

  // =========================
  // UI
  // =========================
  return (

    <div className="max-w-7xl mx-auto">

      {/* ========================= */}
      {/* HERO */}
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

        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-8"
      >

        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10">

          <div className="flex items-center gap-5 mb-6">

            <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur">

              <ShieldCheck size={34} />

            </div>

            <div>

              <h1 className="text-4xl font-black">
                Validation Services
              </h1>

              <p className="text-white/70 mt-2">
                Submit professional NIN validation requests securely
              </p>

            </div>

          </div>

          <div className="grid md:grid-cols-3 gap-4">

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">

              <p className="text-sm text-white/70">
                Fast Processing
              </p>

              <h3 className="text-2xl font-bold mt-1">
                Instant
              </h3>

            </div>

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">

              <p className="text-sm text-white/70">
                Security
              </p>

              <h3 className="text-2xl font-bold mt-1">
                Encrypted
              </h3>

            </div>

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">

              <p className="text-sm text-white/70">
                Platform Status
              </p>

              <h3 className="text-2xl font-bold mt-1">
                Active
              </h3>

            </div>

          </div>

        </div>

      </motion.div>

      {/* ========================= */}
      {/* MAIN GRID */}
      {/* ========================= */}
      <div className="grid lg:grid-cols-3 gap-8">

        {/* ========================= */}
        {/* LEFT */}
        {/* ========================= */}
        <div className="lg:col-span-2 space-y-8">

          {/* SERVICES */}
          <motion.div

            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-8"
          >

            <div className="flex items-center gap-3 mb-8">

              <Fingerprint
                size={24}
                className="text-blue-600"
              />

              <h2 className="text-2xl font-bold dark:text-white">
                Select Validation Type
              </h2>

            </div>

            <div className="grid md:grid-cols-2 gap-5">

              {services.map((s) => (

                <button
                  key={s.key}

                  onClick={() =>
                    setSelectedService(s.key)
                  }

                  className={`text-left rounded-3xl border p-5 transition-all duration-300 ${
                    selectedService === s.key
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-xl scale-[1.02]"
                      : "bg-gray-50 dark:bg-[#0B1120] border-gray-100 dark:border-gray-800 hover:shadow-lg"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div>

                      <h3 className="font-bold text-lg">
                        {s.label}
                      </h3>

                      <p className={`text-sm mt-2 ${
                        selectedService === s.key
                          ? "text-white/80"
                          : "text-gray-500"
                      }`}>
                        Professional verification service
                      </p>

                    </div>

                    <div className={`text-2xl font-black ${
                      selectedService === s.key
                        ? "text-white"
                        : "text-blue-600"
                    }`}>
                      ₦{pricing?.[s.key] || 0}
                    </div>

                  </div>

                </button>

              ))}

            </div>

          </motion.div>

          {/* SLIP */}
          <motion.div

            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              delay: 0.1,
            }}

            className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-8"
          >

            <div className="flex items-center gap-3 mb-8">

              <FileText
                size={24}
                className="text-blue-600"
              />

              <h2 className="text-2xl font-bold dark:text-white">
                Slip Option
              </h2>

            </div>

            <div className="grid md:grid-cols-4 gap-4">

              {[
                "none",
                "regular",
                "standard",
                "premium",
              ].map((s) => (

                <button
                  key={s}

                  onClick={() =>
                    setSlip(s)
                  }

                  className={`rounded-3xl border p-5 transition-all ${
                    slip === s
                      ? "bg-black text-white border-black scale-105"
                      : "bg-gray-50 dark:bg-[#0B1120] border-gray-100 dark:border-gray-800 hover:shadow-lg"
                  }`}
                >

                  <div className="text-xl font-black">

                    {s === "none"
                      ? "₦0"
                      : `₦${slipPrice}`}

                  </div>

                  <div className="text-sm mt-2 capitalize">
                    {s}
                  </div>

                </button>

              ))}

            </div>

          </motion.div>

          {/* INPUT */}
          <motion.div

            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              delay: 0.2,
            }}

            className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-8"
          >

            <h2 className="text-2xl font-bold mb-6 dark:text-white">
              Verification Information
            </h2>

            <input
              type="text"

              placeholder="Enter 11-digit NIN"

              value={nin}

              onChange={(e) =>
                setNin(e.target.value)
              }

              className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />

            {/* FILE */}
            <div className="mt-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-8 text-center">

              <Upload
                size={38}
                className="mx-auto text-blue-600 mb-4"
              />

              <h3 className="font-semibold dark:text-white">
                Upload Payment Proof
              </h3>

              <p className="text-sm text-gray-500 mt-2 mb-5">
                JPG, PNG or PDF (max 2MB)
              </p>

              <input
                type="file"

                accept="image/*,application/pdf"

                onChange={handleFile}

                className="w-full"
              />

              {proof && (

                <div className="mt-5 flex items-center justify-center gap-2 text-green-600 font-medium">

                  <CheckCircle2 size={18} />

                  Payment proof uploaded

                </div>

              )}

            </div>

          </motion.div>

        </div>

        {/* ========================= */}
        {/* RIGHT */}
        {/* ========================= */}
        <div className="space-y-8">

          {/* SUMMARY */}
          <motion.div

            initial={{
              opacity: 0,
              x: 20,
            }}

            animate={{
              opacity: 1,
              x: 0,
            }}

            className="sticky top-5 bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-8"
          >

            <div className="flex items-center gap-3 mb-8">

              <CreditCard
                size={24}
                className="text-blue-600"
              />

              <h2 className="text-2xl font-bold dark:text-white">
                Payment Summary
              </h2>

            </div>

            <div className="space-y-5">

              <div className="flex justify-between">

                <span className="text-gray-500">
                  Service Fee
                </span>

                <span className="font-bold dark:text-white">
                  ₦{basePrice}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-gray-500">
                  Slip Fee
                </span>

                <span className="font-bold dark:text-white">
                  ₦{extraSlip}
                </span>

              </div>

              <div className="border-t pt-5 flex justify-between text-xl font-black dark:text-white">

                <span>Total</span>

                <span>
                  ₦{total}
                </span>

              </div>

            </div>

            {/* BANK */}
            <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-6">

              <p className="text-white/70 text-sm mb-2">
                Payment Account
              </p>

              <h3 className="text-xl font-black">
                OPAY
              </h3>

              <p className="mt-2 text-lg font-bold">
                6104102697
              </p>

              <p className="text-white/80 mt-1">
                WASHINGTON AMEDU
              </p>

            </div>

            {/* BUTTON */}
            <button

              onClick={submit}

              disabled={loading}

              className={`w-full mt-8 py-5 rounded-3xl text-white font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                loading
                  ? "bg-gray-400"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02]"
              }`}
            >

              {loading ? (
                <>
                  <Loader2
                    size={22}
                    className="animate-spin"
                  />
                  Submitting...
                </>
              ) : (
                <>
                  <BadgeCheck size={22} />
                  Submit Request
                </>
              )}

            </button>

            <p className="text-xs text-center text-gray-500 mt-5">
              Payments are reviewed manually before approval
            </p>

          </motion.div>

        </div>

      </div>

    </div>
  );
}