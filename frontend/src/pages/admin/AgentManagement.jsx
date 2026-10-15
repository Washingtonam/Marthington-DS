import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CircleUserRound,
  Clock3,
  MessageCircle,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";
import SlideOver from "../../components/ui/SlideOver";
import {
  agentJobFieldLabels,
  getAgentJobFormFields,
  parseAgentJobForm,
} from "../../lib/agentJobForm";

const serviceOptions = [
  { value: "name-modification", label: "Name modification" },
  { value: "date-of-birth-modification", label: "Date of birth modification" },
  { value: "other", label: "Other service" },
];

const statusLabels = {
  pending: "Pending",
  "in-progress": "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const formatAmount = (amount) => new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
}).format(Number(amount) || 0);

const formatDate = (date) => date ? new Date(date).toLocaleDateString() : "—";

const whatsappUrl = (phone, message) => {
  let number = String(phone || "").replace(/\D/g, "");
  if (number.startsWith("0")) number = `234${number.slice(1)}`;
  if (number.length < 7 || number.length > 15) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

function readDraft(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(`agent-communications-draft:${userId}`) || "null");
    if (value && typeof value.message === "string" && typeof value.subject === "string") return value;
  } catch (error) {
    console.error("Could not load communications draft:", error);
  }
  return { subject: "", message: "" };
}

export default function AgentManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const userId = user?.id || user?._id || user?.email || "account";
  const requestedTab = new URLSearchParams(location.search).get("tab");
  const tab = location.pathname === "/admin/communications"
    ? "messages"
    : requestedTab === "jobs" ? "jobs" : "agents";
  const [manualAgents, setManualAgents] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: "", whatsapp: "" });
  const [customerType, setCustomerType] = useState("manual");
  const [customerId, setCustomerId] = useState("");
  const [serviceType, setServiceType] = useState("name-modification");
  const [amount, setAmount] = useState("");
  const [pastedForm, setPastedForm] = useState("");
  const [jobFormData, setJobFormData] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [draft, setDraft] = useState(() => readDraft(userId));

  const loadData = useCallback(async () => {
    try {
      const [agentsResponse, jobsResponse] = await Promise.all([
        api.get("/api/admin/agents"),
        api.get("/api/admin/agents/jobs"),
      ]);
      setManualAgents(agentsResponse.data?.manualAgents || []);
      setRegisteredUsers(agentsResponse.data?.registeredUsers || []);
      setJobs(jobsResponse.data?.jobs || []);
    } catch (loadError) {
      console.error("Agent management load failed:", loadError);
      toastError(loadError.response?.data?.message || "Could not load agent management data.");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const allContacts = useMemo(() => [
    ...manualAgents.map((agent) => ({ ...agent, contactType: "manual", source: "Manual agent" })),
    ...registeredUsers.map((account) => ({ ...account, contactType: "registered", source: "BMS registered" })),
  ], [manualAgents, registeredUsers]);

  const visibleContacts = allContacts.filter((contact) => {
    const searchable = `${contact.name} ${contact.whatsapp || ""} ${contact.email || ""}`.toLowerCase();
    return searchable.includes(query.toLowerCase());
  });

  const selectedAgentJobs = selectedAgent
    ? jobs.filter((job) => job.customerType === selectedAgent.contactType
      && String(job.agentId || job.registeredUserId) === String(selectedAgent._id))
    : [];

  const handleCreateAgent = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/api/admin/agents", agentForm);
      setAgentForm({ name: "", whatsapp: "" });
      setShowAgentForm(false);
      await loadData();
      success("Agent added.");
    } catch (saveError) {
      console.error("Agent creation failed:", saveError);
      toastError(saveError.response?.data?.message || "Could not add this agent.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateJob = async (event) => {
    event.preventDefault();
    if (!customerId) {
      toastError("Choose an agent or registered account for this job.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/admin/agents/jobs", {
        customerType,
        ...(customerType === "manual" ? { agentId: customerId } : { registeredUserId: customerId }),
        serviceType,
        amount: amount === "" ? 0 : Number(amount),
        formData: jobFormData,
      });
      setShowJobForm(false);
      setCustomerId("");
      setAmount("");
      setPastedForm("");
      setJobFormData({});
      await loadData();
      success("Job logged and added to service requests.");
    } catch (saveError) {
      console.error("Agent job creation failed:", saveError);
      toastError(saveError.response?.data?.message || "Could not log this job.");
    } finally {
      setBusy(false);
    }
  };

  const handleParseForm = () => {
    const parsed = parseAgentJobForm(pastedForm);
    setJobFormData((current) => ({ ...current, ...parsed }));
    if (!Object.keys(parsed).length) toastError("No recognized form fields found. Check the pasted labels and try again.");
    else success(`${Object.keys(parsed).length} form fields detected. Review them before saving.`);
  };

  const updateJobStatus = async (job, status) => {
    try {
      const response = await api.patch(`/api/admin/agents/jobs/${job._id}/status`, { status });
      setJobs((current) => current.map((item) => item._id === job._id ? response.data.job : item));
      if (selectedJob?._id === job._id) setSelectedJob(response.data.job);
      success("Job status updated.");
    } catch (updateError) {
      console.error("Agent job status update failed:", updateError);
      toastError(updateError.response?.data?.message || "Could not update job status.");
    }
  };

  const toggleRecipient = (contact) => {
    const key = `${contact.contactType}:${contact._id}`;
    setSelectedRecipients((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(`agent-communications-draft:${userId}`, JSON.stringify(draft));
      success("Message draft saved on this account.");
    } catch (saveError) {
      console.error("Communications draft save failed:", saveError);
      toastError("Could not save this draft in this browser.");
    }
  };

  const recipientRecords = allContacts.filter((contact) => (
    selectedRecipients.includes(`${contact.contactType}:${contact._id}`) && contact.whatsapp
  ));

  const changeServiceType = (value) => {
    setServiceType(value);
    setJobFormData({});
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Super Admin workspace</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Agents &amp; communications</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Manage manually added agents separately from BMS accounts, log their work, and prepare WhatsApp messages.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setCustomerType("manual"); setCustomerId(""); setShowJobForm(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Plus size={17} aria-hidden="true" /> Log a job
        </button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" role="tablist" aria-label="Agent management sections">
        {[
          { id: "agents", label: "Agents", icon: Users },
          { id: "jobs", label: "Logged jobs", icon: BriefcaseBusiness },
          { id: "messages", label: "Communications", icon: MessageCircle },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => navigate(id === "messages"
              ? "/admin/communications"
              : id === "jobs" ? "/admin/agents?tab=jobs" : "/admin/agents")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 ${
              tab === id
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            {React.createElement(icon, { size: 16, "aria-hidden": true })}{label}
          </button>
        ))}
      </div>

      {tab !== "messages" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900 sm:max-w-md">
            <Search size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === "agents" ? "Search by name, phone, or email" : "Search jobs by agent, service, or NIN"}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              aria-label={tab === "agents" ? "Search agents" : "Search logged jobs"}
            />
          </label>
          {tab === "agents" && (
            <button type="button" onClick={() => setShowAgentForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <Plus size={16} aria-hidden="true" /> Add manual agent
            </button>
          )}
          {tab === "jobs" && (
            <button type="button" onClick={() => { setCustomerType("manual"); setCustomerId(""); setShowJobForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] focus-visible:outline-2">
              <Plus size={16} aria-hidden="true" /> Log a job
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400" role="status">Loading agent workspace…</div>
      ) : tab === "agents" ? (
        <section className="space-y-6" aria-label="Agent directory">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleContacts.map((contact) => (
              <button
                key={`${contact.contactType}:${contact._id}`}
                type="button"
                onClick={() => setSelectedAgent(contact)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md focus-visible:outline-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(var(--accent-rgb),0.10)] text-[var(--accent-text)]">
                    <CircleUserRound size={21} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900 dark:text-white">{contact.name}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{contact.source}</span>
                  </span>
                  <ArrowUpRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                </div>
                <span className="mt-4 block truncate text-sm text-slate-600 dark:text-slate-300">{contact.whatsapp || contact.email || "No phone number on account"}</span>
                {contact.email && contact.whatsapp && <span className="mt-1 block truncate text-xs text-slate-500">{contact.email}</span>}
                <span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <span className="text-slate-500">{contact.jobs || 0} jobs logged</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatAmount(contact.totalAmount)}</span>
                </span>
              </button>
            ))}
          </div>
          {!visibleContacts.length && <EmptyState message="No agents or registered accounts match your search." />}
        </section>
      ) : tab === "jobs" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Logged agent jobs">
          {jobs.filter((job) => `${job.agentName} ${job.serviceType} ${job.formData?.nin || ""}`.toLowerCase().includes(query.toLowerCase())).length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr><th className="px-5 py-3">Job / service</th><th className="px-5 py-3">Agent / account</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Logged</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {jobs.filter((job) => `${job.agentName} ${job.serviceType} ${job.formData?.nin || ""}`.toLowerCase().includes(query.toLowerCase())).map((job) => (
                    <tr key={job._id} className="cursor-pointer transition hover:bg-slate-50 focus-within:bg-slate-50 dark:hover:bg-slate-800/60 dark:focus-within:bg-slate-800/60" onClick={() => setSelectedJob(job)}>
                      <td className="px-5 py-4"><button type="button" className="text-left font-semibold text-slate-900 focus-visible:outline-2 dark:text-white">{job.serviceType.replace(/-/g, " ")}</button><span className="mt-1 block text-xs text-slate-500">Request ID {String(job._id).slice(-7)}</span></td>
                      <td className="px-5 py-4"><span className="font-medium">{job.agentName}</span><span className="mt-1 block text-xs text-slate-500">{job.customerType === "registered" ? "BMS registered" : "Manual agent"}</span></td>
                      <td className="px-5 py-4 font-medium">{formatAmount(job.amount)}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize dark:bg-slate-800">{statusLabels[job.status] || job.status}</span></td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState message="No logged jobs yet. Log a job to associate it with an agent or registered account." />}
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Compose a WhatsApp message</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose recipients, then open each prepared chat to review and send.</p>
              </div>
              <button type="button" onClick={saveDraft} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 dark:border-slate-700 dark:hover:bg-slate-800">Save draft</button>
            </div>
            <label className="mt-5 block text-sm font-semibold">Message subject <span className="font-normal text-slate-400">(optional)</span>
              <input value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-[var(--accent-text)] dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="mt-4 block text-sm font-semibold">Message
              <textarea value={draft.message} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} maxLength={4000} rows={7} required className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal leading-6 outline-none focus:border-[var(--accent-text)] dark:border-slate-700 dark:bg-slate-950" placeholder="Write the message you want to send…" />
            </label>
            <div className="mt-2 text-right text-xs text-slate-500">{draft.message.length}/4000</div>
            <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              WhatsApp opens one recipient at a time. Nothing is sent automatically; review the prepared chat and send it yourself.
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Recipients</h3>
              <span className="text-xs text-slate-500">{selectedRecipients.length} selected</span>
            </div>
            <label className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <Search size={15} className="text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Find recipients" aria-label="Search communication recipients" />
            </label>
            <div className="mt-3 max-h-[26rem] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {visibleContacts.map((contact) => {
                const key = `${contact.contactType}:${contact._id}`;
                return (
                  <label key={key} className={`flex items-start gap-3 py-3 ${contact.whatsapp ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                    <input type="checkbox" disabled={!contact.whatsapp} checked={selectedRecipients.includes(key)} onChange={() => toggleRecipient(contact)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{contact.name}</span>
                      <span className="block truncate text-xs text-slate-500">{contact.whatsapp || "No WhatsApp number"} · {contact.source}</span>
                    </span>
                  </label>
                );
              })}
              {!visibleContacts.length && <p className="py-6 text-center text-sm text-slate-500">No contacts found.</p>}
            </div>
            {selectedRecipients.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                {recipientRecords.map((contact) => {
                  const message = [draft.subject.trim(), draft.message.trim()].filter(Boolean).join("\n\n");
                  const href = whatsappUrl(contact.whatsapp, message);
                  return (
                    <a
                      key={`${contact.contactType}:${contact._id}`}
                      href={href || undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!href || !draft.message.trim()}
                      onClick={(event) => { if (!href || !draft.message.trim()) event.preventDefault(); }}
                      className={`flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium dark:border-slate-700 ${
                        href && draft.message.trim() ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30" : "cursor-not-allowed text-slate-400"
                      }`}
                    >
                      <span className="truncate">{contact.name}</span><span className="inline-flex shrink-0 items-center gap-1 text-xs"><Send size={14} /> Open WhatsApp</span>
                    </a>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <SlideOver isOpen={showAgentForm} onClose={() => setShowAgentForm(false)} title="Add manual agent">
        <form onSubmit={handleCreateAgent} className="space-y-5">
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Manual agents are contact records created here and are kept distinct from accounts registered on BMS.</p>
          <label className="block text-sm font-semibold">Agent name
            <input required maxLength={120} value={agentForm.name} onChange={(event) => setAgentForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <label className="block text-sm font-semibold">WhatsApp number
            <input required type="tel" maxLength={20} value={agentForm.whatsapp} onChange={(event) => setAgentForm((current) => ({ ...current, whatsapp: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">{busy ? "Saving…" : "Save agent"}</button>
        </form>
      </SlideOver>

      <SlideOver isOpen={showJobForm} onClose={() => setShowJobForm(false)} title="Log an agent job">
        <form onSubmit={handleCreateJob} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Customer source
              <select value={customerType} onChange={(event) => { setCustomerType(event.target.value); setCustomerId(""); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="manual">Manual agent</option><option value="registered">BMS registered account</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">Agent / account
              <select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="">Select a contact</option>
                {(customerType === "manual" ? manualAgents.filter((agent) => agent.active !== false) : registeredUsers).map((contact) => (
                  <option key={contact._id} value={contact._id}>{contact.name}{contact.whatsapp ? ` — ${contact.whatsapp}` : ""}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Job / service
              <select value={serviceType} onChange={(event) => changeServiceType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950">
                {serviceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Amount (NGN)
              <input type="number" min="0" max="100000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </div>
          <label className="block text-sm font-semibold">Paste the customer’s form
            <textarea rows={7} value={pastedForm} onChange={(event) => setPastedForm(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs leading-5 dark:border-slate-700 dark:bg-slate-950" placeholder={"NIN: ...\nLast Name/Surname: ...\nFirst Name: ...\nDate of Birth: ..."} />
          </label>
          <button type="button" onClick={handleParseForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Parse pasted form</button>
          <div className="grid gap-4 sm:grid-cols-2">
            {getAgentJobFormFields(serviceType).map((field) => (
              <label key={field} className="block text-sm font-semibold">{agentJobFieldLabels[field]}
                {field === "previousSelfServiceModification" ? (
                  <select value={jobFormData[field] || ""} onChange={(event) => setJobFormData((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950">
                    <option value="">Not specified</option><option>Yes</option><option>No</option>
                  </select>
                ) : (
                  <input type={field === "dateOfBirth" ? "date" : field === "email" ? "email" : "text"} value={jobFormData[field] || ""} onChange={(event) => setJobFormData((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
                )}
              </label>
            ))}
          </div>
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-400">Parsed values are suggestions only. Review every field before saving. This logs an internal job; it does not submit to NIMC or alter a customer account.</p>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">{busy ? "Saving…" : "Save job"}</button>
        </form>
      </SlideOver>

      <SlideOver isOpen={!!selectedAgent} onClose={() => setSelectedAgent(null)} title={selectedAgent?.name || "Agent details"}>
        {selectedAgent && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Summary label="Source" value={selectedAgent.source} />
              <Summary label="WhatsApp" value={selectedAgent.whatsapp || "Not listed"} />
              <Summary label="Jobs logged" value={selectedAgentJobs.length} />
            </div>
            {selectedAgent.email && <p className="text-sm text-slate-600 dark:text-slate-300">{selectedAgent.email} · {selectedAgent.role}</p>}
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">Jobs from this contact</h3>
              <span className="text-sm font-semibold">{formatAmount(selectedAgentJobs.reduce((sum, job) => sum + (Number(job.amount) || 0), 0))} total</span>
            </div>
            {selectedAgentJobs.length ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {selectedAgentJobs.map((job) => (
                  <button key={job._id} type="button" onClick={() => { setSelectedAgent(null); setSelectedJob(job); }} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span><span className="block font-semibold capitalize">{job.serviceType.replace(/-/g, " ")}</span><span className="mt-1 block text-xs text-slate-500">{formatDate(job.createdAt)} · {statusLabels[job.status] || job.status}</span></span>
                    <span className="font-semibold">{formatAmount(job.amount)}</span>
                  </button>
                ))}
              </div>
            ) : <EmptyState message="No jobs have been logged for this contact yet." />}
            <button type="button" onClick={() => { setCustomerType(selectedAgent.contactType); setCustomerId(selectedAgent._id); setSelectedAgent(null); setShowJobForm(true); }} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]"><Plus size={16} className="mr-2 inline" />Log a job for this contact</button>
          </div>
        )}
      </SlideOver>

      <SlideOver isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title={selectedJob?.serviceType?.replace(/-/g, " ") || "Job details"}>
        {selectedJob && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Summary label="Customer" value={selectedJob.agentName} />
              <Summary label="Source" value={selectedJob.customerType === "registered" ? "BMS registered account" : "Manual agent"} />
              <Summary label="Amount" value={formatAmount(selectedJob.amount)} />
              <Summary label="Logged" value={new Date(selectedJob.createdAt).toLocaleString()} />
            </div>
            <label className="block text-sm font-semibold">Status
              <select value={selectedJob.status} onChange={(event) => updateJobStatus(selectedJob, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div>
              <h3 className="mb-3 font-bold">Submitted job details</h3>
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {Object.entries(selectedJob.formData || {}).map(([key, value]) => (
                  <div key={key} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(10rem,0.7fr)_1fr] sm:gap-4">
                    <dt className="text-xs font-medium text-slate-500">{agentJobFieldLabels[key] || key}</dt>
                    <dd className="break-words text-sm">{String(value)}</dd>
                  </div>
                ))}
                {!Object.keys(selectedJob.formData || {}).length && <p className="p-4 text-sm text-slate-500">No form details were supplied.</p>}
              </dl>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700"><Clock3 size={24} className="mx-auto text-slate-400" aria-hidden="true" /><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{message}</p></div>;
}
