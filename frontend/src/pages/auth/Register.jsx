import { useState } from "react";
import { useNavigate } from "react-router-dom";
 
import {
  Eye,
  EyeOff,
  User,
  Mail,
  LockKeyhole,
  ShieldCheck,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

import { motion } from "framer-motion";

export default function Register() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nin: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // =========================
  // HANDLE CHANGE
  // =========================
  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // REGISTER
  // =========================
  const handleRegister = async () => {

    if (
      !form.firstName ||
      !form.lastName ||
      !form.nin ||
      !form.email ||
      !form.password
    ) {
      return alert("Please complete all fields");
    }

    if (form.password !== form.confirmPassword) {
      return alert("Passwords do not match");
    }

    if (form.nin.length < 11) {
      return alert("Enter valid NIN");
    }

    setLoading(true);

    try {

      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        90000
      );

      const res = await api(
        "https://xcombinator.onrender.com/api/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(form),

          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      const data = await res;

      if (data.error) {

        alert(data.error);

        setLoading(false);

        return;
      }

      alert("Registration successful");

      navigate("/login");

    } catch (error) {

      if (error.name === "AbortError") {

        alert(
          "Server is taking too long. Try again."
        );

      } else {

        alert("Network error.");
      }
    }

    setLoading(false);
  };

  return (

    <div className="min-h-screen bg-[#020617] relative overflow-hidden flex items-center justify-center px-4 py-10">

      {/* BACKGROUND */}
      <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-blue-600/20 blur-[120px] rounded-full" />

      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-indigo-500/20 blur-[120px] rounded-full" />

      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] [background-size:22px_22px]" />

      {/* MAIN */}
      <motion.div
        initial={{
          opacity: 0,
          y: 25,
        }}

        animate={{
          opacity: 1,
          y: 0,
        }}

        transition={{
          duration: 0.5,
        }}

        className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 backdrop-blur-xl"
      >

        {/* LEFT */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-12 relative overflow-hidden">

          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

          {/* TOP */}
          <div className="relative z-10">

            <div className="flex items-center gap-3 mb-8">

              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                <ShieldCheck size={30} />
              </div>

              <div>

                <h1 className="text-3xl font-black">
                  Xcombinator
                </h1>

                <p className="text-sm text-white/70">
                  Secure Identity Platform
                </p>

              </div>

            </div>

            <h2 className="text-5xl font-black leading-tight max-w-md">
              Create Your Verification Account
            </h2>

            <p className="mt-6 text-white/70 leading-relaxed max-w-lg">
              Join agents, businesses and professionals using
              Xcombinator for fast and secure identity verification.
            </p>

          </div>

          {/* FEATURES */}
          <div className="relative z-10 space-y-4">

            <div className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur">

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <BadgeCheck size={22} />
                </div>

                <div>

                  <h3 className="font-semibold">
                    Reliable Processing
                  </h3>

                  <p className="text-sm text-white/70">
                    Real-time verification and tracking
                  </p>

                </div>

              </div>

            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur">

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>

                <div>

                  <h3 className="font-semibold">
                    Trusted Security
                  </h3>

                  <p className="text-sm text-white/70">
                    Secure access and encrypted requests
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* RIGHT */}
        <div className="bg-white dark:bg-[#0F172A] p-8 md:p-12 flex items-center">

          <div className="w-full max-w-md mx-auto">

            {/* MOBILE LOGO */}
            <div className="lg:hidden text-center mb-8">

              <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                Xcombinator
              </h1>

              <p className="text-gray-500 mt-2">
                Secure Identity Platform
              </p>

            </div>

            {/* HEADER */}
            <div className="mb-8">

              <h2 className="text-4xl font-black text-gray-900 dark:text-white">
                Create Account 🚀
              </h2>

              <p className="text-gray-500 mt-3">
                Register to access secure verification
                services and request management.
              </p>

            </div>

            {/* FORM */}
            <div className="space-y-5">

              {/* FIRST + LAST */}
              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    First Name
                  </label>

                  <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] rounded-2xl px-4 py-3">

                    <User
                      size={18}
                      className="text-gray-400"
                    />

                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      onChange={handleChange}
                      className="bg-transparent outline-none w-full text-sm"
                    />

                  </div>

                </div>

                <div>

                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Last Name
                  </label>

                  <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] rounded-2xl px-4 py-3">

                    <User
                      size={18}
                      className="text-gray-400"
                    />

                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      onChange={handleChange}
                      className="bg-transparent outline-none w-full text-sm"
                    />

                  </div>

                </div>

              </div>

              {/* NIN */}
              <div>

                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  NIN Number
                </label>

                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] rounded-2xl px-4 py-3">

                  <BadgeCheck
                    size={18}
                    className="text-gray-400"
                  />

                  <input
                    type="text"
                    name="nin"
                    placeholder="Enter NIN"
                    onChange={handleChange}
                    className="bg-transparent outline-none w-full text-sm"
                  />

                </div>

              </div>

              {/* EMAIL */}
              <div>

                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Email Address
                </label>

                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] rounded-2xl px-4 py-3">

                  <Mail
                    size={18}
                    className="text-gray-400"
                  />

                  <input
                    type="email"
                    name="email"
                    placeholder="Enter Email"
                    onChange={handleChange}
                    className="bg-transparent outline-none w-full text-sm"
                  />

                </div>

              </div>

              {/* PASSWORD */}
              <div>

                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Password
                </label>

                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] rounded-2xl px-4 py-3">

                  <LockKeyhole
                    size={18}
                    className="text-gray-400"
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }

                    name="password"

                    placeholder="Create Password"

                    onChange={handleChange}

                    className="bg-transparent outline-none w-full text-sm"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >

                    {showPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />
                    }

                  </button>

                </div>

              </div>

              {/* CONFIRM */}
              <div>

                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Confirm Password
                </label>

                <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] rounded-2xl px-4 py-3">

                  <LockKeyhole
                    size={18}
                    className="text-gray-400"
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }

                    name="confirmPassword"

                    placeholder="Confirm Password"

                    onChange={handleChange}

                    className="bg-transparent outline-none w-full text-sm"
                  />

                </div>

              </div>

              {/* BUTTON */}
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white py-4 rounded-2xl font-semibold transition-all shadow-xl flex items-center justify-center gap-2"
              >

                {loading
                  ? "Creating account..."
                  : (
                    <>
                      Create Account
                      <ArrowRight size={18} />
                    </>
                  )
                }

              </button>

            </div>

            {/* FOOTER */}
            <div className="mt-8 text-center">

              <p className="text-sm text-gray-500">

                Already have an account?{" "}

                <span
                  onClick={() => navigate("/login")}
                  className="text-blue-600 font-semibold cursor-pointer hover:underline"
                >
                  Login
                </span>

              </p>

            </div>

          </div>

        </div>

      </motion.div>

    </div>
  );
}