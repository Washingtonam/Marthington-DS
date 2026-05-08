import { useEffect, useState } from "react";
import api from "../lib/axios";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  XCircle,
  Receipt,
  ShieldCheck,
  Search,
} from "lucide-react";

import { motion } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function Transactions() {

  const [transactions, setTransactions] = useState([]);

  const [filtered, setFiltered] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  // =========================
  // FETCH
  // =========================
  useEffect(() => {

    const fetchTransactions = async () => {

      try {

        const res = await fetch(
          `${API_BASE}/api/transactions?userId=${user?.id}`
        );

        const data = await res.json();

        if (res.ok) {

          setTransactions(data);

          setFiltered(data);
        }

      } catch (err) {

        console.error(err);
      }

      setLoading(false);
    };

    if (user?.id) {

      fetchTransactions();
    }

  }, []);

  // =========================
  // SEARCH
  // =========================
  useEffect(() => {

    if (!search) {

      setFiltered(transactions);

      return;
    }

    const q = search.toLowerCase();

    const result = transactions.filter((tx) =>

      getTitle(tx)
        .toLowerCase()
        .includes(q)

      ||

      tx?.status
        ?.toLowerCase()
        .includes(q)

      ||

      tx?.requestId?.service
        ?.toLowerCase()
        .includes(q)

      ||

      tx?.nin
        ?.includes(q)
    );

    setFiltered(result);

  }, [search, transactions]);

  // =========================
  // HELPERS
  // =========================
  const getTitle = (tx) => {

    switch (tx.type) {

      case "UNIT_ADD":
        return "Wallet Funding";

      case "UNIT_DEDUCT":
        return "Unit Usage";

      case "NIN":
        return "NIN Verification";

      case "SERVICE":
        return "NIN Service Request";

      default:
        return "Transaction";
    }
  };

  const getAmount = (tx) => {

    if (tx.amount > 0) {
      return `₦${tx.amount?.toLocaleString()}`;
    }

    if (tx.unitsUsed > 0) {
      return `-${tx.unitsUsed} unit(s)`;
    }

    if (tx.units > 0) {
      return `+${tx.units} unit(s)`;
    }

    return "-";
  };

  const isCredit = (tx) =>
    tx.type === "UNIT_ADD";

  const statusStyle = (status) => {

    switch (status) {

      case "success":
      case "approved":
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300";

      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300";

      case "rejected":
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300";

      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
    }
  };

  const statusIcon = (status) => {

    switch (status) {

      case "success":
      case "approved":
        return <BadgeCheck size={16} />;

      case "pending":
        return <Clock3 size={16} />;

      case "rejected":
      case "failed":
        return <XCircle size={16} />;

      default:
        return <Receipt size={16} />;
    }
  };

  const icon = (type) => {

    switch (type) {

      case "UNIT_ADD":
        return (
          <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
            <ArrowDownLeft
              size={26}
              className="text-green-600"
            />
          </div>
        );

      case "UNIT_DEDUCT":
        return (
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <ArrowUpRight
              size={26}
              className="text-red-500"
            />
          </div>
        );

      case "NIN":
        return (
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
            <ShieldCheck
              size={26}
              className="text-blue-600"
            />
          </div>
        );

      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-500/10 flex items-center justify-center">
            <Receipt
              size={26}
              className="text-gray-600"
            />
          </div>
        );
    }
  };

  // =========================
  // TOTALS
  // =========================
  const totalFunding = transactions
    .filter(tx => tx.type === "UNIT_ADD")
    .reduce((acc, tx) => acc + (tx.amount || 0), 0);

  // =========================
  // UI
  // =========================
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

        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-8"
      >

        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">

          {/* LEFT */}
          <div>

            <div className="flex items-center gap-4 mb-5">

              <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center">

                <Wallet size={34} />

              </div>

              <div>

                <h1 className="text-4xl font-black">
                  Transactions
                </h1>

                <p className="text-white/70 mt-1">
                  Track funding, services and unit usage
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl px-5 py-4 w-fit">

              <ShieldCheck size={18} />

              <p className="text-sm">
                All transaction records are securely stored
              </p>

            </div>

          </div>

          {/* RIGHT */}
          <div className="bg-white/10 border border-white/10 backdrop-blur rounded-3xl p-6 min-w-[230px]">

            <p className="text-sm text-white/60 mb-2">
              Total Funding
            </p>

            <h2 className="text-4xl font-black">
              ₦{totalFunding.toLocaleString()}
            </h2>

          </div>

        </div>

      </motion.div>

      {/* ========================= */}
      {/* SEARCH */}
      {/* ========================= */}
      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-5 mb-6">

        <div className="relative">

          <Search
            size={20}
            className="absolute left-4 top-4 text-gray-400"
          />

          <input
            type="text"

            placeholder="Search transaction, service or status..."

            value={search}

            onChange={(e) =>
              setSearch(e.target.value)
            }

            className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>

      </div>

      {/* ========================= */}
      {/* LOADING */}
      {/* ========================= */}
      {loading && (

        <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-10 text-center">

          <p className="text-gray-500">
            Loading transactions...
          </p>

        </div>

      )}

      {/* ========================= */}
      {/* EMPTY */}
      {/* ========================= */}
      {!loading && filtered.length === 0 && (

        <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-10 text-center">

          <div className="flex justify-center mb-5">

            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-500/10 flex items-center justify-center">

              <Receipt
                size={38}
                className="text-gray-400"
              />

            </div>

          </div>

          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            No Transactions Found
          </h2>

          <p className="text-gray-500 mt-2">
            Your payment and service history will appear here.
          </p>

        </div>

      )}

      {/* ========================= */}
      {/* LIST */}
      {/* ========================= */}
      <div className="space-y-5">

        {filtered.map((tx, index) => (

          <motion.div
            key={tx._id}

            initial={{
              opacity: 0,
              y: 10,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              delay: index * 0.03,
            }}

            className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6 hover:shadow-2xl transition"
          >

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

              {/* LEFT */}
              <div className="flex gap-4">

                {icon(tx.type)}

                <div>

                  <h2 className="font-bold text-lg text-gray-800 dark:text-white">
                    {getTitle(tx)}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(
                      tx.createdAt
                    ).toLocaleString()}
                  </p>

                  {/* SERVICE */}
                  {tx.requestId?.service && (

                    <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 rounded-full">

                      <Receipt size={13} />

                      {tx.requestId.service}
                      {" "}
                      ({tx.requestId.type})

                    </div>

                  )}

                  {/* NIN */}
                  {tx.nin && (

                    <p className="text-xs text-gray-400 mt-3">
                      NIN:
                      {" "}
                      {tx.nin}
                    </p>

                  )}

                  {/* PROOF */}
                  {tx.proof && (

                    <a
                      href={tx.proof}

                      target="_blank"

                      rel="noreferrer"

                      className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                    >
                      View Payment Proof →
                    </a>

                  )}

                </div>

              </div>

              {/* RIGHT */}
              <div className="md:text-right">

                {/* AMOUNT */}
                <h2
                  className={`text-2xl font-black ${
                    isCredit(tx)
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >

                  {getAmount(tx)}

                </h2>

                {/* STATUS */}
                <div
                  className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full mt-3 ${statusStyle(tx.status)}`}
                >

                  {statusIcon(tx.status)}

                  {tx.status}

                </div>

              </div>

            </div>

          </motion.div>

        ))}

      </div>

    </div>
  );
}