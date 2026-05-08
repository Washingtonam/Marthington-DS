import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import api from "../lib/axios";
import {
  ShieldCheck,
  BadgeCheck,
  Clock3,
  ArrowRight,
  CheckCircle2,
  Wallet,
  Users,
  FileCheck2,
} from "lucide-react";

import { motion } from "framer-motion";

export default function Home() {

  const navigate = useNavigate();

  useEffect(() => {

    const user = localStorage.getItem("user");

    if (user) {
      navigate("/dashboard");
    }

  }, [navigate]);

  return (

    <div className="min-h-screen bg-[#020617] overflow-hidden text-white relative">

      {/* BACKGROUND */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full" />

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full" />

      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] [background-size:24px_24px]" />

      {/* ========================= */}
      {/* NAVBAR */}
      {/* ========================= */}
      <header className="relative z-20 border-b border-white/10 backdrop-blur-xl bg-white/[0.03]">

        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          {/* LOGO */}
          <div className="flex items-center gap-4">

            <img
              src="/logo.png"
              alt="logo"
              className="w-12 h-12 object-contain"
            />

            <img
              src="/logofull.png"
              alt="logo full"
              className="h-9 object-contain hidden md:block"
            />

          </div>

          {/* BUTTONS */}
          <div className="flex items-center gap-3">

            <button
              onClick={() => navigate("/login")}
              className="text-sm text-white/80 hover:text-white transition"
            >
              Login
            </button>

            <button
              onClick={() => navigate("/register")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-lg"
            >
              Get Started
            </button>

          </div>

        </div>

      </header>

      {/* ========================= */}
      {/* HERO */}
      {/* ========================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24">

        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* LEFT */}
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.5,
            }}
          >

            {/* BADGE */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-sm text-blue-200 mb-6">

              <ShieldCheck size={16} />

              Secure NIN Verification Platform

            </div>

            {/* HEADING */}
            <h1 className="text-5xl md:text-7xl font-black leading-tight">

              Verify NIN

              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                {" "}Fast
              </span>

              <br />

              Process Requests
              <br />

              Professionally

            </h1>

            {/* TEXT */}
            <p className="mt-8 text-lg text-white/70 max-w-2xl leading-relaxed">

              Built for agents, cybercafés, institutions and
              professionals who need fast, reliable and secure
              identity verification with real-time request management.

            </p>

            {/* BUTTONS */}
            <div className="mt-10 flex flex-wrap gap-4">

              <button
                onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition px-7 py-4 rounded-2xl font-semibold shadow-2xl flex items-center gap-2"
              >

                Create Account

                <ArrowRight size={18} />

              </button>

              <button
                onClick={() => navigate("/login")}
                className="border border-white/15 bg-white/5 hover:bg-white/10 transition px-7 py-4 rounded-2xl font-semibold backdrop-blur"
              >
                Login
              </button>

            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-5 mt-14">

              <div>

                <h2 className="text-3xl font-black text-blue-400">
                  24/7
                </h2>

                <p className="text-sm text-white/60 mt-1">
                  Platform Access
                </p>

              </div>

              <div>

                <h2 className="text-3xl font-black text-indigo-400">
                  Fast
                </h2>

                <p className="text-sm text-white/60 mt-1">
                  Verification Speed
                </p>

              </div>

              <div>

                <h2 className="text-3xl font-black text-cyan-400">
                  Secure
                </h2>

                <p className="text-sm text-white/60 mt-1">
                  Encrypted System
                </p>

              </div>

            </div>

          </motion.div>

          {/* RIGHT */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
            }}

            animate={{
              opacity: 1,
              scale: 1,
            }}

            transition={{
              duration: 0.6,
            }}

            className="relative"
          >

            <div className="bg-white/[0.04] border border-white/10 rounded-[2rem] p-7 backdrop-blur-xl shadow-2xl">

              {/* CARD TOP */}
              <div className="flex justify-between items-center mb-8">

                <div>

                  <p className="text-white/50 text-sm">
                    Active Platform
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Xcombinator
                  </h2>

                </div>

                <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">

                  <CheckCircle2
                    size={30}
                    className="text-green-400"
                  />

                </div>

              </div>

              {/* CARDS */}
              <div className="space-y-5">

                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex items-start gap-4">

                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">

                    <BadgeCheck
                      size={26}
                      className="text-blue-400"
                    />

                  </div>

                  <div>

                    <h3 className="font-semibold text-lg">
                      NIN Validation
                    </h3>

                    <p className="text-white/60 text-sm mt-1">
                      Validate identity records instantly
                      with accurate data response.
                    </p>

                  </div>

                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex items-start gap-4">

                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center">

                    <FileCheck2
                      size={26}
                      className="text-indigo-400"
                    />

                  </div>

                  <div>

                    <h3 className="font-semibold text-lg">
                      Modification Requests
                    </h3>

                    <p className="text-white/60 text-sm mt-1">
                      Handle corrections and updates
                      professionally with tracking.
                    </p>

                  </div>

                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex items-start gap-4">

                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center">

                    <Wallet
                      size={26}
                      className="text-cyan-400"
                    />

                  </div>

                  <div>

                    <h3 className="font-semibold text-lg">
                      Wallet & Units
                    </h3>

                    <p className="text-white/60 text-sm mt-1">
                      Fund accounts and process requests
                      without delays.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </motion.div>

        </div>

      </section>

      {/* ========================= */}
      {/* FEATURES */}
      {/* ========================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">

        {/* TITLE */}
        <div className="text-center mb-16">

          <h2 className="text-4xl md:text-5xl font-black">
            Built For Serious Operations
          </h2>

          <p className="text-white/60 mt-5 max-w-2xl mx-auto">
            Everything you need to manage verification,
            requests, clients and transactions from one dashboard.
          </p>

        </div>

        {/* GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* CARD */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-7 hover:bg-white/[0.06] transition">

            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">

              <ShieldCheck
                size={30}
                className="text-blue-400"
              />

            </div>

            <h3 className="text-xl font-bold mb-3">
              Secure Verification
            </h3>

            <p className="text-white/60 text-sm leading-relaxed">
              Secure verification process with reliable
              request handling and data protection.
            </p>

          </div>

          {/* CARD */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-7 hover:bg-white/[0.06] transition">

            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">

              <Clock3
                size={30}
                className="text-indigo-400"
              />

            </div>

            <h3 className="text-xl font-bold mb-3">
              Fast Processing
            </h3>

            <p className="text-white/60 text-sm leading-relaxed">
              Process requests quickly without unnecessary
              waiting or operational delays.
            </p>

          </div>

          {/* CARD */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-7 hover:bg-white/[0.06] transition">

            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-6">

              <Users
                size={30}
                className="text-cyan-400"
              />

            </div>

            <h3 className="text-xl font-bold mb-3">
              Multi-User Ready
            </h3>

            <p className="text-white/60 text-sm leading-relaxed">
              Built for agents, organizations,
              cybercafés and growing verification teams.
            </p>

          </div>

          {/* CARD */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-7 hover:bg-white/[0.06] transition">

            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">

              <Wallet
                size={30}
                className="text-green-400"
              />

            </div>

            <h3 className="text-xl font-bold mb-3">
              Wallet System
            </h3>

            <p className="text-white/60 text-sm leading-relaxed">
              Buy units, track transactions and
              manage verification spending efficiently.
            </p>

          </div>

        </div>

      </section>

      {/* ========================= */}
      {/* CTA */}
      {/* ========================= */}
      <section className="relative z-10 px-6 pb-20">

        <div className="max-w-5xl mx-auto bg-gradient-to-r from-blue-700 to-indigo-700 rounded-[2rem] p-10 md:p-14 text-center shadow-2xl">

          <h2 className="text-4xl md:text-5xl font-black leading-tight">
            Ready To Start?
          </h2>

          <p className="text-white/80 mt-5 max-w-2xl mx-auto">
            Create your account and start processing
            verification requests professionally today.
          </p>

          <button
            onClick={() => navigate("/register")}
            className="mt-8 bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold hover:scale-105 transition"
          >
            Create Free Account
          </button>

        </div>

      </section>

    </div>
  );
}