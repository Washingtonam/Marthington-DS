import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

/**
 * ActivityCard - Displays a single activity/request item in the recent activity feed
 * Shows status, service type, amount, and other details
 */
export default function ActivityCard({ activity, statusLabel, statusBadgeColor, statusIcon }) {
  const navigate = useNavigate();

  const latestUpdate = Array.isArray(activity.statusHistory)
    ? activity.statusHistory[0]
    : null;
  const latestNote = latestUpdate?.note || activity.status || "No update yet";

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="flex flex-col gap-4 p-4 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors cursor-pointer dark:bg-slate-800/70 dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700"
      onClick={() => navigate(`/verify-result/${activity._id}`)}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {activity.service || activity.type || "Service Request"}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate">
            {activity.nin ? `NIN: ${activity.nin}` : activity.serviceCategory || activity.category || "NIMC"}
          </p>
          <div className="mt-3 inline-flex">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeColor}`}>
              <span>{statusIcon}</span>
              <span>{statusLabel}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {new Date(activity.createdAt || activity.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Amount</p>
          <p className="font-semibold mt-1 text-slate-900 dark:text-slate-100">
            ₦{Number(activity.amount || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pipeline</p>
          <p className="font-semibold mt-1 text-slate-900 dark:text-slate-100">
            {activity.serviceCategory || activity.category || "NIMC"}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Latest Log</p>
          <p className="font-semibold mt-1 truncate text-slate-900 dark:text-slate-100">{latestNote}</p>
        </div>
      </div>
    </motion.div>
  );
}
