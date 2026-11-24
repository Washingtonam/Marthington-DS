import React from "react";
import { useSearchParams } from "react-router-dom";
import { BriefcaseBusiness, Mail, MessageSquareText, Users } from "lucide-react";
import AgentManagement from "./AgentManagement";
import Communications from "./Communications";
import OutsourcedJobs from "./OutsourcedJobs";

const tabs = [
  { id: "agents", label: "Agents", icon: Users },
  { id: "jobs", label: "Logged jobs", icon: BriefcaseBusiness },
  { id: "outsourced", label: "Outsourced agents & jobs", icon: BriefcaseBusiness },
  { id: "templates", label: "Message templates", icon: Mail },
  { id: "dispatch", label: "Message dispatch", icon: MessageSquareText },
];

export default function AgentsJobs({ initialTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || initialTab;
  const activeTab = tabs.some((tab) => tab.id === requestedTab) ? requestedTab : "agents";

  const selectTab = (tab) => setSearchParams({ tab }, { replace: true });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Management</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Agents &amp; Jobs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Manage agent directories, job workflows, and agent communications together.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" role="tablist" aria-label="Agent and job tools">
        {tabs.map(({ id, label, icon: Icon }) => (
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

      {activeTab === "agents" ? (
        <AgentManagement view="agents" />
      ) : activeTab === "jobs" ? (
        <AgentManagement view="jobs" />
      ) : activeTab === "outsourced" ? (
        <OutsourcedJobs />
      ) : (
        <Communications mode={activeTab} />
      )}
    </div>
  );
}
