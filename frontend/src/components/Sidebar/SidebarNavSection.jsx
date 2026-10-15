import React from "react";
import { ChevronDown } from "lucide-react";

export default function SidebarNavSection({
  id,
  title,
  icon,
  open,
  expanded,
  onToggle,
  canToggle = true,
  children,
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-disabled={!canToggle || undefined}
        aria-controls={`sidebar-group-${id}`}
        aria-label={`${canToggle ? (expanded ? "Collapse" : "Expand") : "Current"} ${title} navigation group`}
        title={open ? undefined : title}
        disabled={!canToggle}
        className={`mb-1 flex w-full items-center rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 ${
          open ? "justify-between" : "justify-center"
        }`}
      >
        <span className={`flex min-w-0 items-center ${open ? "gap-2" : "justify-center"}`}>
          {!open && icon}
          {open && <span className="truncate">{title}</span>}
        </span>
        {open && (
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>
      <div
        id={`sidebar-group-${id}`}
        className="space-y-1"
        aria-label={`${title} links`}
        hidden={!expanded}
      >
        {children}
      </div>
    </section>
  );
}
