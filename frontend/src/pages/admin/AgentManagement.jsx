import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CircleUserRound,
  Clock3,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";
import SlideOver from "../../components/ui/SlideOver";
import {
  agentJobFieldLabels,
  generateCatalogServiceForm,
  parseCatalogServiceForm,
} from "../../lib/agentJobForm";

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
const getJobAmount = (job, catalog) => {
  const amount = Number(job.amount);
  if (Number.isFinite(amount) && amount > 0) return amount;
  const servicePrice = Number(catalog.find((service) => service.serviceCode === job.serviceCode)?.price);
  return Number.isFinite(servicePrice) ? servicePrice : (Number.isFinite(amount) ? amount : 0);
};
const getJobServiceName = (job, catalog) => catalog.find((service) => service.serviceCode === job.serviceCode)?.name
  || job.serviceType
  || "Service";

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

export default function AgentManagement({ view }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const userId = user?.id || user?._id || user?.email || "account";
  const requestedTab = new URLSearchParams(location.search).get("tab");
  const initialCustomerType = new URLSearchParams(location.search).get("customerType");
  const initialCustomerId = new URLSearchParams(location.search).get("customerId");
  const hasRequestedCustomer = ["manual", "registered"].includes(initialCustomerType) && Boolean(initialCustomerId);
  const tab = view || (location.pathname === "/admin/communications"
    ? "messages"
    : location.pathname.endsWith("/jobs") || requestedTab === "jobs" ? "jobs" : "agents");
  const [manualAgents, setManualAgents] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showJobForm, setShowJobForm] = useState(hasRequestedCustomer);
  const [showJobAgentForm, setShowJobAgentForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: "", whatsapp: "", email: "" });
  const [jobAgentForm, setJobAgentForm] = useState({ name: "", whatsapp: "", email: "" });
  const [customerType, setCustomerType] = useState(() => (
    ["manual", "registered"].includes(initialCustomerType) ? initialCustomerType : "manual"
  ));
  const [customerId, setCustomerId] = useState(() => hasRequestedCustomer ? initialCustomerId : "");
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceCode, setServiceCode] = useState("");
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
      const savedAgents = agentsResponse.data?.manualAgents || [];
      setManualAgents((current) => {
        const savedIds = new Set(savedAgents.map((agent) => String(agent._id)));
        return [...savedAgents, ...current.filter((agent) => !savedIds.has(String(agent._id)))];
      });
      setRegisteredUsers(agentsResponse.data?.registeredUsers || []);
      setJobs(jobsResponse.data?.jobs || []);
      setNow(Date.now());
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

  useEffect(() => {
    let cancelled = false;
    api.get("/api/services/catalog")
      .then((response) => {
        if (!cancelled) setCatalog(Array.isArray(response.data?.services) ? response.data.services : []);
      })
      .catch((loadError) => {
        console.error("Service catalog load failed:", loadError);
        if (!cancelled) setCatalogError(loadError.response?.data?.message || "Could not load services from the service catalog.");
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const categories = [...new Set(catalog.filter((service) => service.status === "active")
    .map((service) => service.category === "NIN" ? "NIMC" : service.category))];
  const selectedService = catalog.find((service) => service.serviceCode === serviceCode && service.status === "active");
  const selectedServiceFields = Array.isArray(selectedService?.metadata?.formFields)
    ? selectedService.metadata.formFields.filter((field) => field?.key && !["title", "subtitle"].includes(field.type))
    : [];

  const allContacts = useMemo(() => [
    ...manualAgents.map((agent) => ({ ...agent, contactType: "manual", source: "Offline agent" })),
    ...registeredUsers.map((account) => ({ ...account, contactType: "registered", source: "Marketing agent" })),
  ], [manualAgents, registeredUsers]);

  const visibleContacts = allContacts.filter((contact) => {
    const searchable = `${contact.name} ${contact.whatsapp || ""} ${contact.email || ""}`.toLowerCase();
    return searchable.includes(query.toLowerCase());
  });
  const communicationContacts = visibleContacts.filter((contact) => {
    if (audience === "manual") return contact.contactType === "manual";
    if (contact.contactType !== "registered") return audience === "all";
    if (audience === "active") return contact.status === "active" && contact.approvalStatus === "approved";
    if (audience === "wallet") return Number(contact.walletBalanceKobo || 0) > 0 || Number(contact.walletBalance || 0) > 0;
    if (audience === "inactive") {
      const inactivityLimit = now - 30 * 24 * 60 * 60 * 1000;
      const lastLogin = Date.parse(contact.lastLogin);
      return contact.status !== "active"
        || contact.approvalStatus !== "approved"
        || !contact.lastLogin
        || !Number.isFinite(lastLogin)
        || lastLogin < inactivityLimit;
    }
    return true;
  });
  const eligibleRegisteredUsers = registeredUsers.filter((account) => (
    account.status === "active" && account.approvalStatus === "approved"
  ));

  const selectedAgentJobs = selectedAgent
    ? jobs.filter((job) => job.customerType === selectedAgent.contactType
      && String(job.agentId || job.registeredUserId) === String(selectedAgent._id))
    : [];

  const handleSaveAgent = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const contactDetails = { ...agentForm };
      if (!contactDetails.email.trim()) delete contactDetails.email;
      if (editingAgent) {
        await api.put(`/api/admin/agents/${editingAgent._id}`, contactDetails);
      } else {
        await api.post("/api/admin/agents", contactDetails);
      }
      setAgentForm({ name: "", whatsapp: "", email: "" });
      setEditingAgent(null);
      setShowAgentForm(false);
      await loadData();
      success(editingAgent ? "Agent details updated." : "Agent added.");
    } catch (saveError) {
      console.error("Agent save failed:", saveError);
      toastError(saveError.response?.data?.message || "Could not save this agent.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddJobAgent = async () => {
    setBusy(true);
    try {
      const contactDetails = { ...jobAgentForm };
      if (!contactDetails.email.trim()) delete contactDetails.email;
      const response = await api.post("/api/admin/agents", contactDetails);
      const agent = response.data?.agent;
      if (!agent?._id) throw new Error("The saved offline agent was not returned by the server.");
      setManualAgents((current) => current.some((item) => String(item._id) === String(agent._id))
        ? current
        : [...current, { ...agent, jobs: 0, totalAmount: 0 }]);
      setCustomerType("manual");
      setCustomerId(agent._id);
      setJobAgentForm({ name: "", whatsapp: "", email: "" });
      setShowJobAgentForm(false);
      success("Offline agent saved and selected for this job.");
    } catch (saveError) {
      console.error("Offline agent creation from job form failed:", saveError);
      toastError(saveError.response?.data?.message || "Could not save this offline agent.");
    } finally {
      setBusy(false);
    }
  };

  const setAgentActive = async (agent, active) => {
    try {
      const response = await api.put(`/api/admin/agents/${agent._id}`, { active });
      setManualAgents((current) => current.map((item) => item._id === agent._id
        ? { ...item, ...response.data.agent }
        : item));
      setSelectedAgent((current) => current?._id === agent._id
        ? { ...current, ...response.data.agent }
        : current);
      success(active ? "Agent reactivated." : "Agent archived.");
    } catch (updateError) {
      console.error("Agent status update failed:", updateError);
      toastError(updateError.response?.data?.message || "Could not update this agent.");
    }
  };

  const handleCreateJob = async (event) => {
    event.preventDefault();
    if (!customerId) {
      toastError("Choose an offline agent or Marketing agent for this job.");
      return;
    }
    if (!selectedService) {
      toastError("Choose an active service from the service catalog.");
      return;
    }
    const missingField = selectedServiceFields.find((field) => field.required
      && field.type !== "upload"
      && !String(jobFormData[field.key] ?? "").trim());
    if (missingField) {
      toastError(`${missingField.label || missingField.key} is required.`);
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/admin/agents/jobs", {
        customerType,
        ...(customerType === "manual" ? { agentId: customerId } : { registeredUserId: customerId }),
        serviceCode,
        serviceType: selectedService?.name,
        amount: amount === "" || Number(amount) === 0
          ? Number(selectedService.price) || 0
          : Number(amount),
        formData: jobFormData,
      });
      setShowJobForm(false);
      setCustomerId("");
      setAmount("");
      setPastedForm("");
      setJobFormData({});
      setServiceCategory("");
      setServiceCode("");
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
    const parsed = parseCatalogServiceForm(pastedForm, selectedServiceFields);
    setJobFormData((current) => ({ ...current, ...parsed }));
    if (!Object.keys(parsed).length) toastError("No recognized form fields found. Check the pasted labels and try again.");
    else success(`${Object.keys(parsed).length} form fields detected. Review them before saving.`);
  };

  const handleCopyServiceForm = async () => {
    const text = generateCatalogServiceForm(selectedServiceFields);
    if (!text) {
      toastError("This service has no copyable form fields configured.");
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(text);
      success("Customer form copied. Send this format so its fields can be parsed when returned.");
    } catch (copyError) {
      console.error("Customer form copy failed:", copyError);
      toastError("Could not copy the form. Select and copy the generated form text below.");
    }
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

  const openJobForm = (type = "manual", contactId = "") => {
    setCustomerType(type);
    setCustomerId(contactId);
    setServiceCategory("");
    setServiceCode("");
    setAmount("");
    setPastedForm("");
    setJobFormData({});
    setShowJobForm(true);
  };

  const changeServiceCode = (value) => {
    setServiceCode(value);
    setJobFormData({});
    const service = catalog.find((item) => item.serviceCode === value);
    setAmount(service ? String(service.price || 0) : "");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Super Admin workspace</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {tab === "messages" ? "Communications" : tab === "jobs" ? "Log jobs" : "Agents"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            {tab === "messages"
              ? "Segment Marketing agents and prepare reviewed WhatsApp messages."
              : tab === "jobs"
                ? "Select a catalog service, enter customer details, and log the work to service requests."
                : "Manage offline agents and distinguish them from Marketing agents registered on the platform."}
          </p>
        </div>
        {tab === "agents" ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate("/admin/agents/jobs")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <BriefcaseBusiness size={16} aria-hidden="true" /> View logged jobs
            </button>
            <button type="button" onClick={() => { setEditingAgent(null); setAgentForm({ name: "", whatsapp: "", email: "" }); setShowAgentForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)]">
              <Plus size={17} aria-hidden="true" /> Add offline agent
            </button>
          </div>
        ) : tab === "jobs" ? (
          <button type="button" onClick={() => openJobForm()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)]">
            <Plus size={17} aria-hidden="true" /> Log a job
          </button>
        ) : null}
      </header>

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
                onClick={() => contact.contactType === "registered"
                  ? navigate(`/admin/user/${contact._id}/details`)
                  : setSelectedAgent(contact)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md focus-visible:outline-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(var(--accent-rgb),0.10)] text-[var(--accent-text)]">
                    <CircleUserRound size={21} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900 dark:text-white">{contact.name}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{contact.source}{contact.contactType === "manual" && contact.active === false ? " · Archived" : ""}</span>
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
          {!visibleContacts.length && <EmptyState message="No offline or Marketing agents match your search." />}
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
                    <tr key={job._id} tabIndex={0} aria-label={`View ${job.serviceType} job for ${job.agentName}`} className="cursor-pointer transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] dark:hover:bg-slate-800/60" onClick={() => setSelectedJob(job)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedJob(job); } }}>
                      <td className="px-5 py-4"><span className="font-semibold text-slate-900 dark:text-white">{getJobServiceName(job, catalog)}</span><span className="mt-1 block text-xs text-slate-500">Request ID {String(job._id).slice(-7)}</span></td>
                      <td className="px-5 py-4"><span className="font-medium">{job.agentName}</span><span className="mt-1 block text-xs text-slate-500">{job.customerType === "registered" ? "Marketing agent" : "Offline agent"}</span></td>
                      <td className="px-5 py-4 font-medium">{formatAmount(getJobAmount(job, catalog))}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize dark:bg-slate-800">{statusLabels[job.status] || job.status}</span></td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState message="No logged jobs yet. Log a job and associate it with an offline or Marketing agent." />}
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
            <label className="mt-4 block text-sm font-semibold">Audience segment
              <select value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="all">All contacts</option>
                <option value="active">Active Marketing agents</option>
                <option value="wallet">Accounts with wallet funds</option>
                <option value="inactive">No sign-in in 30+ days / inactive</option>
                <option value="manual">Offline agents</option>
              </select>
            </label>
            <label className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <Search size={15} className="text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Find recipients" aria-label="Search communication recipients" />
            </label>
            <div className="mt-3 max-h-[26rem] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {communicationContacts.map((contact) => {
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
              {!communicationContacts.length && <p className="py-6 text-center text-sm text-slate-500">No contacts match this audience segment.</p>}
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

      <SlideOver isOpen={showAgentForm} onClose={() => { setShowAgentForm(false); setEditingAgent(null); }} title={editingAgent ? "Edit offline agent" : "Add offline agent"}>
        <form onSubmit={handleSaveAgent} className="space-y-5">
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Offline agents are contact records created here and are kept distinct from Marketing agents registered on the platform.</p>
          <label className="block text-sm font-semibold">Agent name
            <input required maxLength={120} value={agentForm.name} onChange={(event) => setAgentForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <label className="block text-sm font-semibold">WhatsApp number
            <input required type="tel" maxLength={20} value={agentForm.whatsapp} onChange={(event) => setAgentForm((current) => ({ ...current, whatsapp: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <label className="block text-sm font-semibold">Email address <span className="font-normal text-slate-400">(optional)</span>
            <input type="email" maxLength={254} value={agentForm.email} onChange={(event) => setAgentForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">{busy ? "Saving…" : editingAgent ? "Save changes" : "Save agent"}</button>
        </form>
      </SlideOver>

      <SlideOver isOpen={showJobForm} onClose={() => setShowJobForm(false)} title="Log an agent job">
        <form onSubmit={handleCreateJob} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Agent type
              <select value={customerType} onChange={(event) => { setCustomerType(event.target.value); setCustomerId(""); setShowJobAgentForm(false); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="manual">Offline agent</option><option value="registered">Marketing agent</option>
              </select>
            </label>
            <div>
              <label className="block text-sm font-semibold">{customerType === "manual" ? "Offline agent" : "Marketing agent"}
              <select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="">Select an agent</option>
                {(customerType === "manual" ? manualAgents.filter((agent) => agent.active !== false) : eligibleRegisteredUsers).map((contact) => (
                  <option key={contact._id} value={contact._id}>{contact.name}{contact.whatsapp ? ` — ${contact.whatsapp}` : ""}</option>
                ))}
              </select>
              </label>
              {customerType === "manual" && (
                <button type="button" onClick={() => { setJobAgentForm({ name: "", whatsapp: "", email: "" }); setShowJobAgentForm((current) => !current); }} className="mt-2 text-sm font-semibold text-[var(--accent-text)] hover:underline">
                  {showJobAgentForm ? "Cancel adding agent" : "+ Add offline agent"}
                </button>
              )}
            </div>
          </div>
          {showJobAgentForm && customerType === "manual" && (
            <div className="space-y-3 rounded-xl border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.05)] p-4">
              <p className="text-sm font-semibold">Save a new offline agent</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">This creates an offline agent contact and selects them for the job you are logging.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">Agent name
                  <input required maxLength={120} value={jobAgentForm.name} onChange={(event) => setJobAgentForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="block text-sm font-medium">WhatsApp number
                  <input required type="tel" maxLength={20} value={jobAgentForm.whatsapp} onChange={(event) => setJobAgentForm((current) => ({ ...current, whatsapp: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="block text-sm font-medium">Email address <span className="font-normal text-slate-400">(optional)</span>
                  <input type="email" maxLength={254} value={jobAgentForm.email} onChange={(event) => setJobAgentForm((current) => ({ ...current, email: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
                </label>
              </div>
              <button type="button" disabled={busy || !jobAgentForm.name.trim() || !jobAgentForm.whatsapp.trim()} onClick={handleAddJobAgent} className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60">{busy ? "Saving…" : "Save and select offline agent"}</button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Service category
              <select value={serviceCategory} onChange={(event) => { setServiceCategory(event.target.value); setServiceCode(""); setJobFormData({}); setAmount(""); }} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Service
              <select value={serviceCode} onChange={(event) => changeServiceCode(event.target.value)} required disabled={!serviceCategory || catalogLoading} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950">
                <option value="">{catalogLoading ? "Loading catalog…" : "Select a service"}</option>
                {catalog.filter((service) => service.status === "active"
                  && (service.category === "NIN" ? "NIMC" : service.category) === serviceCategory)
                  .map((service) => <option key={service.serviceCode} value={service.serviceCode}>{service.name}</option>)}
              </select>
            </label>
          </div>
          {catalogError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{catalogError}</p>}
          {selectedService?.metadata?.description && <p className="rounded-lg bg-[rgba(var(--accent-rgb),0.08)] p-3 text-sm text-slate-700 dark:text-slate-300">{selectedService.metadata.description}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Amount (NGN)
              <input type="number" min="0" max="100000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
              {selectedService && <span className="mt-1 block text-xs font-normal text-slate-500">Catalog price: {formatAmount(selectedService.price)}. A blank or zero override uses the catalog price.</span>}
            </label>
          </div>
          <label className="block text-sm font-semibold">Paste the customer’s form
            <textarea rows={7} value={pastedForm} onChange={(event) => setPastedForm(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs leading-5 dark:border-slate-700 dark:bg-slate-950" placeholder={"Paste the customer form here using the service field labels.\nExample: NIN: ..."} />
          </label>
          {selectedService && selectedServiceFields.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Customer form template</h3>
                  <p className="mt-1 text-xs text-slate-500">Copy and send this exact field format. The returned text can be pasted above and parsed.</p>
                </div>
                <button type="button" onClick={handleCopyServiceForm} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 dark:border-slate-700 dark:hover:bg-slate-800">Copy form</button>
              </div>
              <textarea readOnly rows={Math.min(10, selectedServiceFields.length)} value={generateCatalogServiceForm(selectedServiceFields)} aria-label="Generated customer form" onFocus={(event) => event.currentTarget.select()} className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-5 dark:border-slate-700 dark:bg-slate-950" />
            </div>
          )}
          <button type="button" disabled={!selectedService} onClick={handleParseForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">Parse pasted form</button>
          <div className="grid gap-4 sm:grid-cols-2">
            {selectedServiceFields.map((field) => (
              <label key={field.key} className={`block text-sm font-semibold ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                {field.label || agentJobFieldLabels[field.key] || field.key}{field.required ? " *" : ""}
                {field.type === "textarea" ? (
                  <textarea required={Boolean(field.required)} rows={4} value={jobFormData[field.key] || ""} placeholder={field.placeholder || ""} onChange={(event) => setJobFormData((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
                ) : field.type === "select" ? (
                  <select required={Boolean(field.required)} value={jobFormData[field.key] || ""} onChange={(event) => setJobFormData((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950">
                    <option value="">Select an option</option>
                    {(Array.isArray(field.options) ? field.options : String(field.options || "").split(",").map((option) => option.trim()).filter(Boolean))
                      .map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === "checkbox" ? (
                  <span className="mt-3 flex items-center gap-2 font-normal">
                    <input type="checkbox" checked={Boolean(jobFormData[field.key])} onChange={(event) => setJobFormData((current) => ({ ...current, [field.key]: event.target.checked }))} />
                    {field.placeholder || "Yes"}
                  </span>
                ) : field.type === "upload" ? (
                  <span className="mt-2 block rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-normal text-slate-500 dark:border-slate-700">
                    File fields are configured for customer submissions; attach files when processing the request.
                  </span>
                ) : (
                  <input required={Boolean(field.required)} type={["text", "email", "number", "date"].includes(field.type) ? field.type : "text"} value={jobFormData[field.key] || ""} placeholder={field.placeholder || ""} onChange={(event) => setJobFormData((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
                )}
              </label>
            ))}
          </div>
          {selectedService && selectedServiceFields.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">No customer form fields are configured for this service in Services Engine. You can still log the job and add notes in the form text above.</p>}
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-400">Parsed values are suggestions only. Review every field before saving. This logs an internal job to the admin service-request list; it does not submit to NIMC or alter a customer account.</p>
          <button type="submit" disabled={busy || !selectedService} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">{busy ? "Saving…" : "Save job"}</button>
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
            {selectedAgent.contactType === "manual" && (
              <>
                <Summary label="Agent status" value={selectedAgent.active === false ? "Archived" : "Active"} />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => { setEditingAgent(selectedAgent); setAgentForm({ name: selectedAgent.name, whatsapp: selectedAgent.whatsapp, email: selectedAgent.email || "" }); setSelectedAgent(null); setShowAgentForm(true); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 dark:border-slate-700 dark:hover:bg-slate-800">Edit agent</button>
                  <button type="button" onClick={() => setAgentActive(selectedAgent, selectedAgent.active === false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {selectedAgent.active === false ? "Reactivate agent" : "Archive agent"}
                  </button>
                </div>
              </>
            )}
            {selectedAgent.email && <p className="text-sm text-slate-600 dark:text-slate-300">{selectedAgent.email} · {selectedAgent.role}</p>}
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">Jobs from this contact</h3>
              <span className="text-sm font-semibold">{formatAmount(selectedAgentJobs.reduce((sum, job) => sum + getJobAmount(job, catalog), 0))} total</span>
            </div>
            {selectedAgentJobs.length ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {selectedAgentJobs.map((job) => (
                  <button key={job._id} type="button" onClick={() => { setSelectedAgent(null); setSelectedJob(job); }} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span><span className="block font-semibold">{getJobServiceName(job, catalog)}</span><span className="mt-1 block text-xs text-slate-500">{formatDate(job.createdAt)} · {statusLabels[job.status] || job.status}</span></span>
                    <span className="font-semibold">{formatAmount(getJobAmount(job, catalog))}</span>
                  </button>
                ))}
              </div>
            ) : <EmptyState message="No jobs have been logged for this contact yet." />}
            <button type="button" disabled={(selectedAgent.contactType === "manual" && selectedAgent.active === false) || (selectedAgent.contactType === "registered" && (selectedAgent.status !== "active" || selectedAgent.approvalStatus !== "approved"))} onClick={() => { setSelectedAgent(null); openJobForm(selectedAgent.contactType, selectedAgent._id); }} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} className="mr-2 inline" />Log a job for this contact</button>
          </div>
        )}
      </SlideOver>

      <SlideOver isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title={selectedJob ? getJobServiceName(selectedJob, catalog) : "Job details"}>
        {selectedJob && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Summary label="Customer" value={selectedJob.agentName} />
              <Summary label="Source" value={selectedJob.customerType === "registered" ? "Marketing agent" : "Offline agent"} />
              <Summary label="Amount" value={formatAmount(getJobAmount(selectedJob, catalog))} />
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
