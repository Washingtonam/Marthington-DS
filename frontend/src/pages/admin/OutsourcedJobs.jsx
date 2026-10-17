import React, { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Loader2, Pencil, Plus, Search, UserRound, X } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";

const statuses = [
  { value: "assigned", label: "Assigned" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const emptyForm = { title: "", agentName: "Abdul", status: "assigned", notes: "" };
const statusStyles = {
  assigned: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "in-progress": "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  completed: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  : "—";

export default function OutsourcedJobs() {
  const { success, error: toastError } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/admin/outsourced-jobs")
      .then((response) => {
        if (cancelled) return;
        if (!Array.isArray(response.data?.jobs)) throw new Error("The outsourced jobs response is invalid.");
        setJobs(response.data.jobs);
      })
      .catch((loadError) => {
        console.error("Outsourced jobs load failed:", loadError);
        if (!cancelled) toastError(loadError.response?.data?.message || "Could not load outsourced jobs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [toastError]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      return `${job.title} ${job.agentName} ${job.notes || ""}`.toLowerCase().includes(normalizedQuery);
    });
  }, [jobs, query, statusFilter]);

  const openNewForm = () => {
    setEditingJob(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (job) => {
    setEditingJob(job);
    setForm({
      title: job.title || "",
      agentName: job.agentName || "Abdul",
      status: job.status || "assigned",
      notes: job.notes || "",
    });
    setShowForm(true);
  };

  const saveJob = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        agentName: form.agentName.trim(),
        status: form.status,
        notes: form.notes.trim(),
      };
      const response = editingJob
        ? await api.put(`/api/admin/outsourced-jobs/${editingJob._id}`, payload)
        : await api.post("/api/admin/outsourced-jobs", payload);
      const savedJob = response.data?.job;
      if (!savedJob?._id) throw new Error("The saved outsourced job was not returned by the server.");
      setJobs((current) => editingJob
        ? current.map((job) => String(job._id) === String(savedJob._id) ? savedJob : job)
        : [savedJob, ...current]);
      setShowForm(false);
      setEditingJob(null);
      setForm(emptyForm);
      success(editingJob ? "Outsourced job updated." : "Outsourced job added.");
    } catch (saveError) {
      console.error("Outsourced job save failed:", saveError);
      toastError(saveError.response?.data?.message || "Could not save this outsourced job.");
    } finally {
      setSaving(false);
    }
  };

  const statusCounts = statuses.reduce((counts, status) => ({
    ...counts,
    [status.value]: jobs.filter((job) => job.status === status.value).length,
  }), {});

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Operations · Super admin</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Outsourced jobs</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Keep track of the work assigned to Abdul and other outsourced agents.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)]"
        >
          <Plus size={17} aria-hidden="true" /> Add outsourced job
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Outsourced job totals">
        <SummaryCard label="Total jobs" count={jobs.length} />
        {statuses.map((status) => (
          <SummaryCard key={status.value} label={status.label} count={statusCounts[status.value]} />
        ))}
      </section>

      {showForm && (
        <form onSubmit={saveJob} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingJob ? "Edit outsourced job" : "Add outsourced job"}</h3>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close job form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              Job name
              <input
                required
                maxLength={160}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Process customer NIN modification"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              Outsourced agent
              <input
                required
                maxLength={120}
                value={form.agentName}
                onChange={(event) => setForm((current) => ({ ...current, agentName: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">
              Notes <span className="font-normal text-slate-500">(optional)</span>
              <textarea
                maxLength={1000}
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Add details or instructions for this job"
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60">
              {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {editingJob ? "Save changes" : "Save job"}
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Job register</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{filteredJobs.length} of {jobs.length} jobs</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Search outsourced jobs</span>
              <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search jobs or agents"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-56"
              />
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-40"
              >
                <option value="all">All statuses</option>
                {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading outsourced jobs…</div>
        ) : filteredJobs.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredJobs.map((job) => (
              <article key={job._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{job.title}</h4>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[job.status] || statusStyles.assigned}`}>
                      {statuses.find((status) => status.value === job.status)?.label || "Assigned"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><UserRound size={15} aria-hidden="true" />{job.agentName}</span>
                    <span>Added {formatDate(job.createdAt)}</span>
                  </div>
                  {job.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{job.notes}</p>}
                </div>
                <button type="button" onClick={() => openEditForm(job)} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-center">
                  <Pencil size={15} aria-hidden="true" /> Edit
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="rounded-2xl bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><BriefcaseBusiness size={24} aria-hidden="true" /></span>
            <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">{jobs.length ? "No matching jobs" : "No outsourced jobs yet"}</h4>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {jobs.length ? "Try changing your search or status filter." : "Add a job when you assign work to Abdul or another outsourced agent."}
            </p>
            {!jobs.length && <button type="button" onClick={openNewForm} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)]"><Plus size={16} aria-hidden="true" /> Add outsourced job</button>}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, count }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
    </div>
  );
}
