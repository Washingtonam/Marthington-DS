import { Search, FileText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../../../lib/axios';
import { toast } from 'sonner';
import Card from '../../../../components/ui/Card';

/**
 * ToolsTab - Quick verification tools and NIN lookup
 */
export default function ToolsTab() {
  const navigate = useNavigate();
  const [ninSearch, setNinSearch] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [ninLoading, setNinLoading] = useState(false);
  const [ninResults, setNinResults] = useState([]);

  const handleVerifyNin = async () => {
    if (!ninSearch || ninSearch.trim().length === 0) return;
    setNinLoading(true);
    try {
      const res = await api.get("/api/verification-requests", {
        params: {
          nin: ninSearch.trim(),
          limit: 20,
          includeServiceRequests: true,
        },
      });
      const data = res.data?.data || [];
      const filteredData =
        verificationFilter === "all"
          ? data
          : data.filter((r) =>
              String(r.status || "").toLowerCase() === verificationFilter
            );
      setNinResults(
        filteredData.map((r) => ({
          id: r._id,
          nin: r.nin || "N/A",
          status: (r.status || "unknown").toUpperCase(),
          pipeline: r.source === "service"
            ? `Service request (${r.service || r.type || "request"})`
            : r.method
            ? `Verification (${r.method})`
            : "Verification",
          createdAt: r.createdAt,
          request: r,
        }))
      );
      if ((data?.length || 0) > 0) {
        toast.success(`Found ${data.length} matching record(s)`);
      } else {
        toast(`No records found for ${ninSearch}`);
      }
    } catch (err) {
      console.error("NIN verify error:", err);
      setNinResults([]);
      toast.error("Verification lookup failed");
    } finally {
      setNinLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="default" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Quick NIN Verification
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Search for and verify NIN numbers across all service requests and verification records
        </p>

        <div className="space-y-3">
          <input
            value={ninSearch}
            onChange={(e) => setNinSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyNin()}
            placeholder="Enter NIN to verify"
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>

          <button
            onClick={handleVerifyNin}
            disabled={ninLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-colors"
          >
            <Search className="w-4 h-4" />
            {ninLoading ? "Checking..." : "Verify"}
          </button>
        </div>
      </Card>

      {ninResults.length > 0 && (
        <Card variant="default">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Found {ninResults.length} Result{ninResults.length !== 1 ? 's' : ''}
          </h4>
          <div className="space-y-3">
            {ninResults.map((r) => (
              <motion.div
                whileHover={{ scale: 1.01 }}
                key={r.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => {
                  navigate(
                    `/admin/verification-requests?nin=${encodeURIComponent(
                      r.nin
                    )}`
                  );
                  toast.success("Opening related verification requests");
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {r.nin}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {r.pipeline} •{" "}
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {r.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
