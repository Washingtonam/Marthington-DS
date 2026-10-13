import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * DashboardMetric - Displays a metric with trend indicator
 * Shows value, label, change percentage, and visual trend
 */
export default function DashboardMetric({
  label,
  value,
  format = "text",
  change,
  changeType = "increase",
  icon,
  color = "blue",
}) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
    red: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
  };

  const isPositive = changeType === "increase";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </span>
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {format === "currency" && "₦"}
          {value}
        </h3>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {isPositive ? (
              <TrendingUp size={16} className="text-green-600" />
            ) : (
              <TrendingDown size={16} className="text-red-600" />
            )}
            <span
              className={`text-sm font-semibold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : "-"}
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">
              vs last month
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
