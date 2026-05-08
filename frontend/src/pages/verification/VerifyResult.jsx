import { useEffect, useState } from "react";
 
import {
  Download,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  Fingerprint,
  Loader2,
  BadgeCheck,
} from "lucide-react";

import { motion } from "framer-motion";

export default function VerifyResult() {

  const [info, setInfo] = useState(null);

  const [loadingType, setLoadingType] = useState(null);

  useEffect(() => {

    try {

      const stored = localStorage.getItem("nin_result");

      if (!stored) return;

      const parsed = JSON.parse(stored);

      const extracted =
        parsed?.data?.data ||
        parsed?.data ||
        parsed;

      setInfo(extracted);

    } catch (err) {

      console.error(
        "Result parse error:",
        err
      );
    }

  }, []);

  // =========================
  // DOWNLOAD
  // =========================
  const downloadSlip = async (type) => {

    if (loadingType) return;

    setLoadingType(type);

    try {

      const res = await fetch(
        "https://xcombinator.onrender.com/api/generate-nin-slip",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            data: info,
            type,
          }),
        }
      );

      const blob = await res.blob();

      const url =
        window.URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;

      a.download = `${type}-slip.pdf`;

      a.click();

      window.URL.revokeObjectURL(url);

    } catch {

      alert("Download failed");
    }

    setLoadingType(null);
  };

  // =========================
  // EMPTY STATE
  // =========================
  if (!info) {

    return (

      <div className="min-h-[70vh] flex items-center justify-center">

        <div className="bg-white dark:bg-[#111827] p-10 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 text-center max-w-lg">

          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-5">

            <Fingerprint
              size={38}
              className="text-red-500"
            />

          </div>

          <h2 className="text-2xl font-bold mb-2 dark:text-white">
            No Verification Data
          </h2>

          <p className="text-gray-500 dark:text-gray-400">
            No verification result found.
            Please perform verification again.
          </p>

        </div>

      </div>
    );
  }

  return (

    <div className="max-w-6xl mx-auto">

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

        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

          {/* LEFT */}
          <div>

            <div className="flex items-center gap-4 mb-5">

              <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center">

                <ShieldCheck size={34} />

              </div>

              <div>

                <h1 className="text-4xl font-black">
                  Verification Result
                </h1>

                <p className="text-white/70 mt-1">
                  Identity verified successfully
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3 bg-green-500/20 border border-green-400/20 rounded-2xl px-5 py-4 w-fit">

              <BadgeCheck size={18} />

              <p className="text-sm">
                Verification Successful
              </p>

            </div>

          </div>

          {/* RIGHT */}
          <div className="bg-white/10 border border-white/10 backdrop-blur rounded-3xl p-6 min-w-[240px]">

            <p className="text-sm text-white/70 mb-2">
              Verified NIN
            </p>

            <h2 className="text-3xl font-black tracking-wider">
              {info.nin}
            </h2>

          </div>

        </div>

      </motion.div>

      {/* ========================= */}
      {/* PROFILE CARD */}
      {/* ========================= */}
      <div className="grid lg:grid-cols-3 gap-8">

        {/* PHOTO */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}

          animate={{
            opacity: 1,
            y: 0,
          }}

          className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center"
        >

          {info.photo ? (

            <img
              src={`data:image/png;base64,${info.photo}`}
              alt="User"

              className="w-52 h-52 rounded-3xl object-cover border-4 border-blue-100 shadow-lg"
            />

          ) : (

            <div className="w-52 h-52 rounded-3xl bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center">

              <User
                size={60}
                className="text-gray-400"
              />

            </div>

          )}

          <h2 className="text-2xl font-bold text-center mt-6 dark:text-white">

            {info.firstname}
            {" "}
            {info.middlename}
            {" "}
            {info.surname}

          </h2>

          <p className="text-gray-500 dark:text-gray-400 mt-2 capitalize">
            {info.gender}
          </p>

        </motion.div>

        {/* DETAILS */}
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

          className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-8"
        >

          <h2 className="text-2xl font-bold mb-8 dark:text-white">
            Personal Information
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            {/* ITEM */}
            <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-5">

              <div className="flex items-center gap-3 mb-2">

                <User
                  size={18}
                  className="text-blue-600"
                />

                <p className="text-sm text-gray-500">
                  Full Name
                </p>

              </div>

              <h3 className="font-bold dark:text-white">
                {info.firstname}
                {" "}
                {info.middlename}
                {" "}
                {info.surname}
              </h3>

            </div>

            {/* ITEM */}
            <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-5">

              <div className="flex items-center gap-3 mb-2">

                <Fingerprint
                  size={18}
                  className="text-blue-600"
                />

                <p className="text-sm text-gray-500">
                  NIN
                </p>

              </div>

              <h3 className="font-bold dark:text-white">
                {info.nin}
              </h3>

            </div>

            {/* ITEM */}
            <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-5">

              <div className="flex items-center gap-3 mb-2">

                <Calendar
                  size={18}
                  className="text-blue-600"
                />

                <p className="text-sm text-gray-500">
                  Date of Birth
                </p>

              </div>

              <h3 className="font-bold dark:text-white">
                {info.birthdate}
              </h3>

            </div>

            {/* ITEM */}
            <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-5">

              <div className="flex items-center gap-3 mb-2">

                <Phone
                  size={18}
                  className="text-blue-600"
                />

                <p className="text-sm text-gray-500">
                  Phone Number
                </p>

              </div>

              <h3 className="font-bold dark:text-white">
                {info.telephoneno || "N/A"}
              </h3>

            </div>

            {/* ADDRESS */}
            <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-5 md:col-span-2">

              <div className="flex items-center gap-3 mb-2">

                <MapPin
                  size={18}
                  className="text-blue-600"
                />

                <p className="text-sm text-gray-500">
                  Address
                </p>

              </div>

              <h3 className="font-bold dark:text-white">
                {info.residence_address || "N/A"}
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                {info.residence_lga}
                {" , "}
                {info.residence_state}
              </p>

            </div>

          </div>

        </motion.div>

      </div>

      {/* ========================= */}
      {/* DOWNLOADS */}
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

        transition={{
          delay: 0.2,
        }}

        className="mt-8 bg-white dark:bg-[#111827] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-8"
      >

        <h2 className="text-2xl font-bold mb-6 dark:text-white">
          Download Slips
        </h2>

        <div className="grid md:grid-cols-3 gap-5">

          {[
            {
              type: "data",
              title: "Basic Slip",
              desc: "Standard verification slip",
            },

            {
              type: "premium",
              title: "Premium Slip",
              desc: "Enhanced premium version",
            },

            {
              type: "long",
              title: "Long Slip",
              desc: "Detailed full-page slip",
            },

          ].map((item) => (

            <div
              key={item.type}

              className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-6 border border-gray-100 dark:border-gray-800"
            >

              <h3 className="font-bold text-lg dark:text-white">
                {item.title}
              </h3>

              <p className="text-sm text-gray-500 mt-2 mb-5">
                {item.desc}
              </p>

              <button
                onClick={() =>
                  downloadSlip(item.type)
                }

                disabled={loadingType !== null}

                className={`w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition ${
                  loadingType === item.type
                    ? "bg-gray-400"
                    : loadingType
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                }`}
              >

                {loadingType === item.type ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download
                  </>
                )}

              </button>

            </div>

          ))}

        </div>

      </motion.div>

    </div>
  );
}