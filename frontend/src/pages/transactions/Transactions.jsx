import { useEffect, useState, useMemo } from "react";
import api from "../../lib/axios"; // Uses your configured axios instance
import { Search, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // Get user from local storage
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  // API Call to fetch transactions
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setError("User session not found.");
      return;
    }

    const fetchTransactions = async () => {
      try {
        const res = await api.get(`/api/users/transactions`);
        setTransactions(res.data || []);
      } catch (err) {
        if (err?.response?.status === 404) {
          try {
            const fallback = await api.get(`/api/transactions?userId=${user.id}`);
            setTransactions(fallback.data || []);
          } catch (fallbackErr) {
            console.error("Transaction fallback failed:", fallbackErr);
            setError("Could not load transactions.");
          }
        } else {
          console.error("Transaction fetch error:", err);
          setError("Could not load transactions.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.id]);

  // Optimized Search Filter
  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((tx) =>
      getTitle(tx).toLowerCase().includes(q) ||
      tx?.status?.toLowerCase().includes(q)
    );
  }, [search, transactions]);

  // Transaction Title Helper
  const getTitle = (tx) => {
    const map = {
      UNIT_ADD: "Wallet Funding",
      UNIT_DEDUCT: "Unit Usage",
      NIN: "NIN Verification",
      SERVICE: "NIN Service Request",
    };
    return map[tx.type] || "Transaction";
  };

  // Transaction Amount Helper
  const getAmount = (tx) => {
    if (tx.amount > 0) return `₦${tx.amount.toLocaleString()}`;
    if (tx.unitsUsed > 0) return `-${tx.unitsUsed} unit(s)`;
    if (tx.units > 0) return `+${tx.units} unit(s)`;
    return "-";
  };

  const isCredit = (tx) => tx.type === "UNIT_ADD";

  // Status Styling Helper
  const statusStyle = (status) => {
    const s = status?.toLowerCase();
    if (s === "success" || s === "approved") return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300";
    if (s === "pending") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300";
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  };

  // Calculate Total Funding
  const totalFunding = useMemo(() => 
    transactions
      .filter((tx) => tx.type === "UNIT_ADD" && (tx.status === "success" || tx.status === "approved"))
      .reduce((acc, tx) => acc + (tx.amount || 0), 0), 
    [transactions]
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* HERO SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-8"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black">Transactions</h1>
            <p className="text-white/70 mt-1">Track your wallet funding and service history</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-3xl p-6 min-w-[200px]">
            <p className="text-sm text-white/60">Total Lifetime Funding</p>
            <h2 className="text-4xl font-black">₦{totalFunding.toLocaleString()}</h2>
          </div>
        </div>
      </motion.div>

      {/* SEARCH INPUT */}
      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-5 mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by transaction type or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ERROR & LOADING STATES */}
      {loading && <div className="text-center p-10 text-gray-500">Loading your transactions...</div>}
      
      {error && (
        <div className="text-center p-10 text-red-500 flex justify-center items-center gap-2">
          <AlertCircle /> {error}
        </div>
      )}
      
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center p-10">
          <p className="text-gray-500">No transactions found matching your search.</p>
        </div>
      )}

      {/* TRANSACTION LIST */}
      <div className="space-y-5">
        {filtered.map((tx) => (
          <motion.div 
            key={tx._id} 
            className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
          >
            <div>
              <h2 className="font-bold text-lg">{getTitle(tx)}</h2>
              <p className="text-sm text-gray-500">
                {new Date(tx.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="md:text-right">
              <h2 className={`text-2xl font-black ${isCredit(tx) ? "text-green-600" : "text-red-500"}`}>
                {getAmount(tx)}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle(tx.status)}`}>
                {tx.status?.toUpperCase()}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}