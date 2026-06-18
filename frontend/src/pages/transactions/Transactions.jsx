import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../lib/axios";
import { useUser } from "../../context/UserContext";
import { formatNaira } from "../../lib/currency";

export default function Transactions() {
  const { user } = useUser();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!user?.id) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/users/transactions`, { 
          params: { page, limit: PAGE_SIZE } 
        });
        setTransactions(res.data?.data || []);
        setTotalPages(res.data?.totalPages || 1);
      } catch (err) {
        setError("Failed to load transaction history.");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [user?.id, page]);

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((tx) =>
      getTitle(tx).toLowerCase().includes(q) || tx?.status?.toLowerCase().includes(q)
    );
  }, [search, transactions]);

  const getTitle = (tx) => {
    const map = { UNIT_ADD: "Wallet Funding", UNIT_DEDUCT: "Service Usage", NIN: "NIN Verification", SERVICE: "Service Request" };
    return map[tx.type] || "Transaction";
  };

  const getAmount = (tx) => {
    // Determine sign based on transaction type for clarity
    const creditTypes = ["UNIT_ADD", "credit"];
    const debitTypes = ["UNIT_DEDUCT", "debit", "SERVICE", "NIN", "BVN", "NIN_AUTO"];
    if (creditTypes.includes(tx.type)) return `+${formatNaira(tx.amount || 0)}`;
    if (debitTypes.includes(tx.type)) return `-${formatNaira(tx.amount || 0)}`;
    // Fallback: show amount with sign from numeric value
    if (typeof tx.amount === "number") {
      return `${tx.amount >= 0 ? "+" : "-"}${formatNaira(Math.abs(tx.amount))}`;
    }
    return "-";
  };

  const statusStyle = (status) => {
    const s = status?.toLowerCase();
    if (s === "success" || s === "approved") return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300";
    if (s === "pending") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300";
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* HEADER CARD */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
        className="relative bg-gradient-to-br from-indigo-950 to-slate-900 rounded-[2rem] p-8 text-white shadow-2xl mb-8"
      >
        <h1 className="text-3xl font-black">Transaction Logs</h1>
        <p className="text-indigo-200 text-sm mt-1">Review your historical wallet and service activity.</p>
      </motion.div>

      {/* SEARCH BAR */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-4 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Filter by type or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* LIST CONTENT */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-blue-500" /></div>
        ) : error ? (
          <div className="text-center p-12 text-red-500 flex flex-col items-center gap-2"><AlertCircle /> {error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 text-slate-500">No transactions recorded.</div>
        ) : (
          filtered.map((tx) => (
            <motion.div key={tx._id} layout className="bg-white dark:bg-[#111827] border dark:border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-bold">{getTitle(tx)}</p>
                <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-black ${tx.amount > 0 ? "text-green-600" : "text-slate-900 dark:text-white"}`}>{getAmount(tx)}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${statusStyle(tx.status)}`}>{tx.status}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-center gap-6 mt-8">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-slate-100 rounded-full disabled:opacity-50"><ChevronLeft size={20}/></button>
        <span className="text-sm font-semibold">Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 bg-slate-100 rounded-full disabled:opacity-50"><ChevronRight size={20}/></button>
      </div>
    </div>
  );
}