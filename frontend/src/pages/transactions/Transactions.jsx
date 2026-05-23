import { useEffect, useState, useMemo } from "react";
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
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

const API_BASE = "https://xcombinator.onrender.com";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // Safely get user
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  // API Call
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setError("User session not found.");
      return;
    }

    const fetchTransactions = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/transactions?userId=${user.id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTransactions(data || []);
      } catch (err) {
        console.error(err);
        setError("Could not load transactions.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.id]);

  // Optimized Filter
  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((tx) =>
      getTitle(tx).toLowerCase().includes(q) ||
      tx?.status?.toLowerCase().includes(q) ||
      tx?.requestId?.service?.toLowerCase().includes(q) ||
      tx?.nin?.includes(q)
    );
  }, [search, transactions]);

  // Helpers
  const getTitle = (tx) => {
    const map = {
      UNIT_ADD: "Wallet Funding",
      UNIT_DEDUCT: "Unit Usage",
      NIN: "NIN Verification",
      SERVICE: "NIN Service Request",
    };
    return map[tx.type] || "Transaction";
  };

  const getAmount = (tx) => {
    if (tx.amount > 0) return `₦${tx.amount.toLocaleString()}`;
    if (tx.unitsUsed > 0) return `-${tx.unitsUsed} unit(s)`;
    if (tx.units > 0) return `+${tx.units} unit(s)`;
    return "-";
  };

  const isCredit = (tx) => tx.type === "UNIT_ADD";

  const statusStyle = (status) => {
    const styles = {
      success: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
      approved: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
      pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300",
      rejected: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
      failed: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    };
    return styles[status] || "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
  };

  const totalFunding = useMemo(() => 
    transactions.filter(tx => tx.type === "UNIT_ADD")
    .reduce((acc, tx) => acc + (tx.amount || 0), 0), 
    [transactions]
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-8 md:p-10 shadow-2xl mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black">Transactions</h1>
            <p className="text-white/70 mt-1">Track funding, services and unit usage</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-3xl p-6 min-w-[200px]">
            <p className="text-sm text-white/60">Total Funding</p>
            <h2 className="text-4xl font-black">₦{totalFunding.toLocaleString()}</h2>
          </div>
        </div>
      </motion.div>

      {/* SEARCH */}
      <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-5 mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#0B1120] border rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* STATES */}
      {loading && <div className="text-center p-10 text-gray-500">Loading transactions...</div>}
      {error && <div className="text-center p-10 text-red-500 flex justify-center gap-2"><AlertCircle /> {error}</div>}
      
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center p-10">
          <p className="text-gray-500">No transactions found.</p>
        </div>
      )}

      {/* LIST */}
      <div className="space-y-5">
        {filtered.map((tx) => (
          <motion.div key={tx._id} className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <h2 className="font-bold text-lg">{getTitle(tx)}</h2>
              <p className="text-sm text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
            </div>
            <div className="md:text-right">
              <h2 className={`text-2xl font-black ${isCredit(tx) ? "text-green-600" : "text-red-500"}`}>{getAmount(tx)}</h2>
              <span className={`px-3 py-1 rounded-full text-xs ${statusStyle(tx.status)}`}>{tx.status}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}