import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";

export default function WorkspaceSwitcher({ isAdminWorkspace, onSwitch }) {
  const { user } = useUser();
  const navigate = useNavigate();
  const { error } = useToast();

  if (user?.role !== "super_admin") return null;

  const switchWorkspace = (event) => {
    const target = event.target.value === "admin" ? "/admin" : "/dashboard";
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
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <ArrowLeftRight size={16} aria-hidden="true" className="text-[var(--accent)]" />
      <span className="sr-only">Workspace</span>
      <select
        aria-label="Workspace"
        value={isAdminWorkspace ? "admin" : "user"}
        onChange={switchWorkspace}
        className="max-w-40 cursor-pointer bg-transparent focus-visible:outline-none"
      >
        <option value="user">User workspace</option>
        <option value="admin">Super Admin</option>
      </select>
    </label>
  );
}
