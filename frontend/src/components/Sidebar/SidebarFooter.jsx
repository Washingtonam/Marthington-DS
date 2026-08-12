import { LogOut, MoonStar, SunMedium } from "lucide-react";

/**
 * SidebarFooter - Contains theme toggle and logout buttons
 * Positioned at the bottom of the sidebar with visual separation
 */
export default function SidebarFooter({ open, theme, onToggleTheme, onLogout }) {
  return (
    <div className="p-6 border-t border-white/10">
      <button
        onClick={onToggleTheme}
        className="w-full mb-3 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition flex items-center justify-center gap-2 font-semibold text-xs"
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? (
          <>
            <SunMedium size={16} className="text-yellow-400" />
            <span className={!open ? "hidden" : ""}>Light</span>
          </>
        ) : (
          <>
            <MoonStar size={16} className="text-indigo-400" />
            <span className={!open ? "hidden" : ""}>Dark</span>
          </>
        )}
      </button>

      <button
        onClick={onLogout}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:opacity-95 py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md"
        title="Logout from your account"
      >
        <LogOut size={16} />
        <span className={!open ? "hidden" : ""}>Logout</span>
      </button>
    </div>
  );
}
