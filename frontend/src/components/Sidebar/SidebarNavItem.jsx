import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * SidebarNavItem - Reusable navigation item component for the sidebar
 * Handles active states, badges, and icon display based on sidebar open/close state
 */
export default function SidebarNavItem({ to, icon, label, badge = 0, open, onNavigate }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  const linkClass = `group relative flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${
    isActive
      ? "bg-white text-blue-900 shadow-2xl scale-[1.02]"
      : "text-white/75 hover:bg-white/10 hover:text-white"
  }`;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={linkClass}
    >
      <div className="flex items-center gap-3">
        <div className={`transition ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
          {icon}
        </div>
        <span
          className={`font-medium text-sm transition-all duration-200 whitespace-nowrap ${
            open ? "opacity-100 max-w-xs" : "opacity-0 max-w-0 overflow-hidden"
          }`}
        >
          {label}
        </span>
      </div>

      <div className={`flex items-center gap-2 ${!open && "hidden"}`}>
        {badge > 0 && (
          <span className="bg-red-500 text-white text-[11px] px-2 py-1 rounded-full min-w-[22px] text-center shadow-lg font-bold">
            {badge}
          </span>
        )}
        <ChevronRight
          size={15}
          className={`transition ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        />
      </div>
    </Link>
  );
}
