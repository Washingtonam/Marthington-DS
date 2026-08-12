import { User, Crown, Activity } from "lucide-react";

/**
 * SidebarUserCard - Displays user profile info in the sidebar
 * Shows avatar, name, email, role, and live status
 */
export default function SidebarUserCard({ user, isSuperAdmin, open }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl mb-8 transition-all duration-300 ${
      open ? "p-4" : "p-2 text-center"
    }`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 blur-3xl rounded-full" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 justify-center lg:justify-start">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shrink-0">
            <User size={20} />
          </div>
          <div
            className={`flex-1 min-w-0 transition-opacity duration-200 ${
              open ? "opacity-100" : "opacity-0 hidden"
            }`}
          >
            <p className="font-semibold truncate text-base">
              {user?.firstName || "User"}
            </p>
            <p className="text-xs text-white/60 truncate">{user?.email}</p>
          </div>
        </div>

        <div
          className={`mt-4 flex items-center justify-between transition-all ${
            !open && "hidden"
          }`}
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Access
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {isSuperAdmin && (
                <Crown size={12} className="text-yellow-400" />
              )}
              <span className="capitalize text-xs font-medium">
                {user?.role?.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="bg-green-500/20 border border-green-400/20 px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1.5 font-semibold">
            <Activity size={10} className="text-green-400 animate-pulse" />
            Live
          </div>
        </div>
      </div>
    </div>
  );
}
