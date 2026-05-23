import { useState } from "react";
import { useNavigate } from "react-router-dom";
 
import {
  UserCircle2,
  Mail,
  ShieldCheck,
  Wallet,
  LockKeyhole,
  Eye,
  EyeOff,
  CreditCard,
  FileText,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

import { motion } from "framer-motion";

const API = "https://xcombinator.onrender.com";

export default function Profile() {

  const navigate = useNavigate();

  // =========================
  // SAFE USER PARSE
  // =========================
  let storedUser = null;

  try {

    storedUser = JSON.parse(
      localStorage.getItem("user")
    );

  } catch {

    storedUser = null;
  }

  // =========================
  // REDIRECT
  // =========================
  if (!storedUser) {

    window.location.href = "/login";

    return null;
  }

  const user = storedUser;

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);

  const [showNew, setShowNew] = useState(false);

  const [loading, setLoading] = useState(false);

  // =========================
  // CHANGE PASSWORD
  // =========================
  const handleChangePassword = async () => {

    if (!currentPassword || !newPassword) {
      return alert("Fill all fields");
    }

    if (newPassword.length < 6) {
      return alert(
        "Password must be at least 6 characters"
      );
    }

    setLoading(true);

    try {

      const res = await  api(
        `${API}/api/change-password`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId: user.id,
            currentPassword,
            newPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      alert("✅ Password updated successfully");

      setCurrentPassword("");
      setNewPassword("");

    } catch (err) {

      alert(
        err.message ||
        "Failed to update password"
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
          <div className="flex items-center gap-5">

            <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">

              <UserCircle2 size={60} />

            </div>

            <div>

              <h1 className="text-3xl md:text-4xl font-black">
                My Profile
              </h1>

              <p className="text-white/70 mt-2">
                Manage your account settings and security
              </p>

            </div>

          </div>

          {/* RIGHT */}
          <div className="bg-white/10 border border-white/10 backdrop-blur rounded-3xl p-5 min-w-[220px]">

            <p className="text-sm text-white/60 mb-1">
              Available Units
            </p>

            <h2 className="text-5xl font-black">
              {user?.units || 0}
            </h2>

          </div>

        </div>

      </motion.div>

      {/* ========================= */}
      {/* GRID */}
      {/* ========================= */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-6">

          {/* ACCOUNT INFO */}
          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6">

            <div className="flex items-center gap-3 mb-6">

              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">

                <ShieldCheck
                  className="text-blue-600"
                  size={24}
                />

              </div>

              <div>

                <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                  Account Info
                </h2>

                <p className="text-sm text-gray-500">
                  Your account details
                </p>

              </div>

            </div>

            {/* INFO */}
            <div className="space-y-5">

              <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-4">

                <div className="flex items-center gap-3">

                  <Mail
                    size={18}
                    className="text-gray-400"
                  />

                  <div>

                    <p className="text-xs text-gray-500">
                      Email Address
                    </p>

                    <p className="font-medium text-sm text-gray-900 dark:text-white break-all">
                      {user?.email}
                    </p>

                  </div>

                </div>

              </div>

              <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-4">

                <div className="flex items-center gap-3">

                  <BadgeCheck
                    size={18}
                    className="text-gray-400"
                  />

                  <div>

                    <p className="text-xs text-gray-500">
                      Account Role
                    </p>

                    <p className="font-medium capitalize text-sm text-gray-900 dark:text-white">
                      {user?.role?.replace("_", " ")}
                    </p>

                  </div>

                </div>

              </div>

              <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-4">

                <div className="flex items-center gap-3">

                  <Wallet
                    size={18}
                    className="text-gray-400"
                  />

                  <div>

                    <p className="text-xs text-gray-500">
                      Units Balance
                    </p>

                    <p className="font-medium text-sm text-gray-900 dark:text-white">
                      {user?.units || 0} Units
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6">

            <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-6">
              Quick Actions
            </h2>

            <div className="space-y-4">

              {/* WALLET */}
              <button
                onClick={() => navigate("/wallet")}
                className="w-full flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-2xl hover:scale-[1.02] transition"
              >

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">

                    <CreditCard size={24} />

                  </div>

                  <div className="text-left">

                    <p className="font-semibold">
                      Fund Wallet
                    </p>

                    <p className="text-xs text-white/70">
                      Buy more verification units
                    </p>

                  </div>

                </div>

                <ArrowRight size={18} />

              </button>

              {/* TRANSACTIONS */}
              <button
                onClick={() => navigate("/transactions")}
                className="w-full flex items-center justify-between bg-gray-900 dark:bg-[#0B1120] text-white p-5 rounded-2xl hover:scale-[1.02] transition"
              >

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">

                    <FileText size={24} />

                  </div>

                  <div className="text-left">

                    <p className="font-semibold">
                      Transactions
                    </p>

                    <p className="text-xs text-white/70">
                      View payment history
                    </p>

                  </div>

                </div>

                <ArrowRight size={18} />

              </button>

            </div>

          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2">

          {/* PASSWORD CARD */}
          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">

            {/* HEADER */}
            <div className="flex items-center gap-4 mb-8">

              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">

                <LockKeyhole
                  size={28}
                  className="text-blue-600"
                />

              </div>

              <div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Change Password
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Keep your account secure with a strong password
                </p>

              </div>

            </div>

            {/* FORM */}
            <div className="space-y-6">

              {/* CURRENT PASSWORD */}
              <div>

                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Current Password
                </label>

                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B1120] rounded-2xl px-4 py-4">

                  <LockKeyhole
                    size={18}
                    className="text-gray-400"
                  />

                  <input
                    type={
                      showCurrent
                        ? "text"
                        : "password"
                    }

                    placeholder="Enter current password"

                    value={currentPassword}

                    onChange={(e) =>
                      setCurrentPassword(
                        e.target.value
                      )
                    }

                    className="bg-transparent outline-none w-full text-sm text-gray-900 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrent(!showCurrent)
                    }
                  >

                    {showCurrent
                      ? <EyeOff size={18} />
                      : <Eye size={18} />
                    }

                  </button>

                </div>

              </div>

              {/* NEW PASSWORD */}
              <div>

                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  New Password
                </label>

                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B1120] rounded-2xl px-4 py-4">

                  <LockKeyhole
                    size={18}
                    className="text-gray-400"
                  />

                  <input
                    type={
                      showNew
                        ? "text"
                        : "password"
                    }

                    placeholder="Create new password"

                    value={newPassword}

                    onChange={(e) =>
                      setNewPassword(
                        e.target.value
                      )
                    }

                    className="bg-transparent outline-none w-full text-sm text-gray-900 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNew(!showNew)
                    }
                  >

                    {showNew
                      ? <EyeOff size={18} />
                      : <Eye size={18} />
                    }

                  </button>

                </div>

              </div>

              {/* SECURITY NOTE */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5">

                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">

                  Use a strong password that contains uppercase letters,
                  lowercase letters, numbers and special characters
                  for maximum account security.

                </p>

              </div>

              {/* BUTTON */}
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition text-white py-4 rounded-2xl font-semibold shadow-xl"
              >

                {loading
                  ? "Updating Password..."
                  : "Update Password"
                }

              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}