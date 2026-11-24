import React from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, MessageCircle, Users } from "lucide-react";
import { useUser } from "../../context/UserContext";
import AdminUsers from "./AdminUsers";
import AdminNotifications from "./AdminNotifications";
import Communications from "./Communications";

const tabs = [
  { id: "users", label: "User directory", icon: Users, superAdminOnly: true },
  { id: "support", label: "Support inbox", icon: MessageCircle },
  { id: "notifications", label: "Notifications", icon: Bell, superAdminOnly: true },
];

export default function PeopleSupport({ initialTab }) {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSuperAdmin = user?.role === "super_admin";
  const visibleTabs = tabs.filter((tab) => !tab.superAdminOnly || isSuperAdmin);
  const requestedTab = searchParams.get("tab") || initialTab;
  const activeTab = visibleTabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "support";

  const selectTab = (tab) => setSearchParams({ tab }, { replace: true });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Management</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">People &amp; Support</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Manage user accounts and respond to support conversations in one workspace.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" role="tablist" aria-label="People and support sections">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => selectTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              activeTab === id
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {React.createElement(Icon, { size: 16, "aria-hidden": true })}
            {label}
          </button>
        ))}
      </div>

      {activeTab === "users" && isSuperAdmin ? (
        <AdminUsers embedded />
      ) : activeTab === "notifications" && isSuperAdmin ? (
        <AdminNotifications />
      ) : (
        <Communications mode="inbox" />
      )}
    </div>
  );
}
