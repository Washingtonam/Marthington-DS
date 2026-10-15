import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";

export default function WorkspaceSwitcher({ isAdminWorkspace, onSwitch }) {
  const { user } = useUser();
  const navigate = useNavigate();
  const { error } = useToast();

  if (user?.role !== "super_admin") return null;

  const switchWorkspace = (workspace) => {
    const target = workspace === "admin" ? "/admin" : "/dashboard";
    if (target === (isAdminWorkspace ? "/admin" : "/dashboard")) return;

    try {
      navigate(target);
      onSwitch?.();
    } catch (switchError) {
      console.error("Workspace navigation failed:", switchError);
      error("Could not switch workspaces. Please try again.");
    }
  };

  return (
    <div
      role="group"
      aria-label="Workspace"
      className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-inner dark:border-slate-700/80 dark:bg-slate-900/80"
    >
      <button
        type="button"
        aria-label="Switch to user workspace"
        aria-pressed={!isAdminWorkspace}
        title="User workspace"
        onClick={() => switchWorkspace("user")}
        className={`inline-flex h-9 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-3 sm:text-sm ${
          !isAdminWorkspace
            ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }`}
      >
        <LayoutDashboard size={16} aria-hidden="true" />
        <span className="hidden sm:inline">User</span>
      </button>
      <button
        type="button"
        aria-label="Switch to Super Admin workspace"
        aria-pressed={isAdminWorkspace}
        title="Super Admin workspace"
        onClick={() => switchWorkspace("admin")}
        className={`inline-flex h-9 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-3 sm:text-sm ${
          isAdminWorkspace
            ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }`}
      >
        <ShieldCheck size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Super Admin</span>
      </button>
    </div>
  );
}
