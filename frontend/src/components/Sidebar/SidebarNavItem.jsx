import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function SidebarNavItem({ to, icon, label, badge = 0, open, onNavigate }) {
  const location = useLocation();
  const isActive = location.pathname === to
    || (to !== "/dashboard" && to !== "/admin" && location.pathname.startsWith(`${to}/`));

  return (
    <Link
      to={to}
      onClick={onNavigate}
      title={open ? undefined : label}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex min-h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        open ? "gap-3" : "justify-center"
      } ${
        isActive
          ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
      }`}
    >
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      {open && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {badge > 0 && (
        <span
          aria-label={`${badge} unread`}
          className={open
            ? `min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${isActive ? "bg-black/10" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200"}`
            : "absolute right-1 top-1 h-2.5 min-w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950"}
        >
          {open ? badge : <span className="sr-only">{badge}</span>}
        </span>
      )}
    </Link>
  );
}
