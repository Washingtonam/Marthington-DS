import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, Mail, MessageCircle, Plus, RefreshCw, Search, Send } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";
import AdminNotifications from "./AdminNotifications";

const emptyTemplate = { name: "", category: "", channel: "email", subject: "", message: "" };

const personalize = (value, contact) => value
  .replaceAll("{{name}}", contact.name || "there")
  .replaceAll("{{email}}", contact.email || "");

const whatsappUrl = (phone, message) => {
  let number = String(phone || "").replace(/\D/g, "");
  if (number.startsWith("0")) number = `234${number.slice(1)}`;
  if (number.length < 7 || number.length > 15) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

const formatDate = (date) => date ? new Date(date).toLocaleString() : "";

function MessageThread({ messages, currentUserId }) {
  return (
    <div className="flex min-h-64 flex-col gap-3 overflow-y-auto rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
      {messages.map((message) => {
        const outgoing = String(message.senderId) === String(currentUserId);
        return (
          <div key={message._id} className={`max-w-[85%] rounded-2xl px-4 py-3 ${outgoing ? "self-end bg-[var(--accent)] text-[var(--accent-foreground)]" : "self-start bg-white shadow-sm dark:bg-slate-800"}`}>
            <p className="mb-1 text-xs font-semibold opacity-70">{message.senderName}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
            <p className="mt-2 text-right text-[10px] opacity-60">{formatDate(message.createdAt)}</p>
          </div>
        );
      })}
      {!messages.length && <p className="m-auto text-sm text-slate-500">No messages in this conversation yet.</p>}
    </div>
  );
}

export default function Communications() {
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSuperAdmin = user?.role === "super_admin";
  const userId = user?.id || user?._id;
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => (
    isSuperAdmin && ["templates", "dispatch", "notifications"].includes(requestedTab)
      ? requestedTab
      : isSuperAdmin ? "templates" : "inbox"
  ));
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(emptyTemplate);
  const [editingId, setEditingId] = useState("");
  const [dispatchTemplateId, setDispatchTemplateId] = useState("");
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState("all");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [emailResult, setEmailResult] = useState("");

  const loadConversations = useCallback(async () => {
    const response = await api.get("/api/admin/communications/conversations");
    setConversations(response.data?.conversations || []);
  }, []);

  const loadThread = useCallback(async (conversation) => {
    const response = await api.get(`/api/admin/communications/conversations/${conversation._id}/messages`);
    setSelectedConversation(response.data.conversation);
    setMessages(response.data.messages || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const requests = [api.get("/api/admin/communications/conversations")];
        if (isSuperAdmin) {
          requests.push(api.get("/api/admin/communications/templates"), api.get("/api/admin/agents"));
        }
        const [conversationResponse, templateResponse, contactsResponse] = await Promise.all(requests);
        if (cancelled) return;
        setConversations(conversationResponse.data?.conversations || []);
        if (isSuperAdmin) {
          setTemplates(templateResponse.data?.templates || []);
          setContacts([
            ...(contactsResponse.data?.manualAgents || []).map((contact) => ({ ...contact, contactType: "manual", source: "Offline agent" })),
            ...(contactsResponse.data?.registeredUsers || []).map((contact) => ({ ...contact, contactType: "registered", source: "Platform agent" })),
          ]);
        }
      } catch (loadError) {
        console.error("Communications load failed:", loadError);
        if (!cancelled) toastError(loadError.response?.data?.message || "Could not load communications.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isSuperAdmin, toastError]);

  const filteredContacts = useMemo(() => contacts.filter((contact) => {
    const searchText = `${contact.name} ${contact.email || ""} ${contact.whatsapp || ""}`.toLowerCase();
    if (!searchText.includes(query.toLowerCase())) return false;
    if (audience === "manual") return contact.contactType === "manual";
    if (audience === "active") return contact.status === "active" && contact.approvalStatus === "approved";
    if (audience === "wallet") return Number(contact.walletBalanceKobo || contact.walletBalance || 0) > 0;
    if (audience === "inactive") return contact.status !== "active" || contact.approvalStatus !== "approved";
    return true;
  }), [audience, contacts, query]);

  const selectedTemplate = templates.find((item) => String(item._id) === dispatchTemplateId);

  const selectTemplate = (item) => {
    setEditingId(String(item._id));
    setIsCreatingTemplate(false);
    setTemplate({
      name: item.name,
      category: item.category,
      channel: item.channel,
      subject: item.subject || "",
      message: item.message,
    });
  };

  const saveTemplate = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = editingId
        ? await api.put(`/api/admin/communications/templates/${editingId}`, template)
        : await api.post("/api/admin/communications/templates", template);
      const saved = response.data.template;
      setTemplates((current) => editingId
        ? current.map((item) => String(item._id) === editingId ? saved : item)
        : [...current, saved]);
      setEditingId(String(saved._id));
      setDispatchTemplateId(String(saved._id));
      setIsCreatingTemplate(false);
      success(editingId ? "Template updated." : "Template added.");
    } catch (saveError) {
      console.error("Communication template save failed:", saveError);
      toastError(saveError.response?.data?.message || "Could not save this template.");
    } finally {
      setBusy(false);
    }
  };

  const toggleRecipient = (contact) => {
    const key = `${contact.contactType}:${contact._id}`;
    setSelectedRecipients((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  };

  const recipientRecords = contacts.filter((contact) => (
    selectedRecipients.includes(`${contact.contactType}:${contact._id}`)
  ));
  const emailRecipients = recipientRecords.filter((contact) => contact.email);

  const sendEmails = async () => {
    if (!selectedTemplate || !emailRecipients.length) return;
    setBusy(true);
    setEmailResult("");
    try {
      const response = await api.post(
        `/api/admin/communications/templates/${selectedTemplate._id}/send`,
        { recipients: emailRecipients.map((contact) => ({ id: contact._id, type: contact.contactType })) },
      );
      const result = response.data;
      const summary = `${result.sent} email${result.sent === 1 ? "" : "s"} sent${result.failed ? `, ${result.failed} failed` : ""}.`;
      setEmailResult(summary);
      if (result.failed) toastError(summary);
      else success(summary);
    } catch (sendError) {
      console.error("Bulk email delivery failed:", sendError);
      toastError(sendError.response?.data?.message || "Could not send these emails.");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!selectedConversation || !reply.trim()) return;
    setBusy(true);
    try {
      const response = await api.post(
        `/api/admin/communications/conversations/${selectedConversation._id}/messages`,
        { text: reply.trim() },
      );
      setMessages((current) => [...current, response.data.message]);
      setReply("");
      await loadConversations();
    } catch (sendError) {
      console.error("Support reply failed:", sendError);
      toastError(sendError.response?.data?.message || "Could not send your reply.");
    } finally {
      setBusy(false);
    }
  };

  const refreshInbox = async () => {
    try {
      await loadConversations();
      if (selectedConversation) await loadThread(selectedConversation);
    } catch (refreshError) {
      console.error("Support inbox refresh failed:", refreshError);
      toastError(refreshError.response?.data?.message || "Could not refresh the inbox.");
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "templates" ? {} : { tab }, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Agent workspace</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Communications</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Send reviewed email and WhatsApp templates to agents, and reply to their text support messages.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" role="tablist" aria-label="Communication tools">
        {isSuperAdmin && (
          <>
              <button type="button" role="tab" aria-selected={activeTab === "templates"} onClick={() => changeTab("templates")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "templates" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
              Message templates
            </button>
              <button type="button" role="tab" aria-selected={activeTab === "dispatch"} onClick={() => changeTab("dispatch")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "dispatch" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                Dispatch & recipients
              </button>
              <button type="button" role="tab" aria-selected={activeTab === "notifications"} onClick={() => changeTab("notifications")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "notifications" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                <Bell size={15} aria-hidden="true" /> Notification center
              </button>
            </>
        )}
        <button type="button" role="tab" aria-selected={activeTab === "inbox"} onClick={() => changeTab("inbox")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "inbox" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
          Support inbox <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{conversations.length}</span>
        </button>
      </div>

      {loading ? (
        <div role="status" className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">Loading communications…</div>
      ) : activeTab === "templates" && isSuperAdmin ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="font-bold">Saved templates</h3><p className="mt-1 text-xs text-slate-500">{templates.length} message drafts</p></div>
              <button type="button" onClick={() => { setEditingId(""); setIsCreatingTemplate(true); setTemplate(emptyTemplate); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-foreground)]"><Plus size={16} /> New template</button>
            </div>
            <div className="max-h-[calc(100vh-18rem)] space-y-2 overflow-y-auto">
              {templates.map((item) => (
                <button type="button" key={item._id} onClick={() => selectTemplate(item)} className={`w-full rounded-xl border p-3 text-left ${editingId === String(item._id) ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.06)]" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}>
                  <span className="flex items-center justify-between gap-3"><span className="font-semibold">{item.name}</span><span className="text-xs capitalize text-slate-500">{item.channel}</span></span>
                  <span className="mt-1 block text-xs text-slate-500">{item.category}</span>
                </button>
              ))}
              {!templates.length && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">No templates saved yet.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {isCreatingTemplate || editingId ? (
              <form onSubmit={saveTemplate} className="space-y-4">
              <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="font-bold">{isCreatingTemplate ? "Create a template" : "Edit template"}</h3>
                <p className="mt-1 text-sm text-slate-500">Set the channel and message content. Use merge fields to personalize messages.</p>
              </div>
              <label className="block text-sm font-medium">Template name
                <input required maxLength={100} value={template.name} onChange={(event) => setTemplate((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">Category
                  <input required maxLength={60} value={template.category} onChange={(event) => setTemplate((current) => ({ ...current, category: event.target.value }))} placeholder="Onboarding, congratulations…" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="block text-sm font-medium">Channel
                  <select value={template.channel} onChange={(event) => setTemplate((current) => ({ ...current, channel: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950">
                    <option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="both">Email & WhatsApp</option>
                  </select>
                </label>
              </div>
              {(template.channel === "email" || template.channel === "both") && (
                <label className="block text-sm font-medium">Email subject
                  <input required maxLength={120} value={template.subject} onChange={(event) => setTemplate((current) => ({ ...current, subject: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
                </label>
              )}
              <label className="block text-sm font-medium">Message
                <textarea required maxLength={4000} rows={6} value={template.message} onChange={(event) => setTemplate((current) => ({ ...current, message: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal leading-6 dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <p className="text-xs text-slate-500">Use {"{{name}}"} and {"{{email}}"} to personalize each message.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" disabled={busy} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60">{busy ? "Saving…" : editingId ? "Save changes" : "Save template"}</button>
                <button type="button" onClick={() => { setEditingId(""); setIsCreatingTemplate(false); setTemplate(emptyTemplate); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
              </div>
              </form>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <MessageCircle size={24} className="text-slate-400" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">Choose a template to edit</h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Select a saved draft from the list or create a new template to get started.</p>
              </div>
            )}
          </section>
        </div>

      ) : activeTab === "dispatch" && isSuperAdmin ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
            <div>
              <h3 className="font-bold">Dispatch a message</h3>
              <p className="mt-1 text-sm text-slate-500">Choose a saved template and audience, then select agents to contact.</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(14rem,0.8fr)_minmax(14rem,1fr)]">
              <label className="block text-sm font-medium">Message template
                <select value={dispatchTemplateId} onChange={(event) => {
                  const choice = templates.find((item) => String(item._id) === event.target.value);
                  if (choice) {
                    setDispatchTemplateId(String(choice._id));
                    setEmailResult("");
                  } else setDispatchTemplateId("");
                }} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <option value="">Select a saved template</option>
                  {templates.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Audience
                <select value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <option value="all">All contacts</option><option value="active">Active platform agents</option><option value="wallet">Accounts with wallet funds</option><option value="inactive">Inactive / pending accounts</option><option value="manual">Offline agents</option>
                </select>
              </label>
              <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
                <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search communication recipients" placeholder="Search agents…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                <span className="shrink-0 text-xs text-slate-500">{selectedRecipients.length} selected</span>
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3"><span className="sr-only">Select</span></th>
                  <th scope="col" className="px-4 py-3">Agent</th>
                  <th scope="col" className="px-4 py-3">Contact details</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredContacts.map((contact) => {
                const key = `${contact.contactType}:${contact._id}`;
                const usable = !selectedTemplate || selectedTemplate.channel === "both"
                  ? Boolean(contact.email || contact.whatsapp)
                  : selectedTemplate.channel === "email"
                    ? Boolean(contact.email)
                    : Boolean(contact.whatsapp);
                return (
                  <tr key={key} className={`${selectedRecipients.includes(key) ? "bg-[rgba(var(--accent-rgb),0.04)]" : ""} ${!usable ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label={`Select ${contact.name}`} disabled={!usable} checked={selectedRecipients.includes(key)} onChange={() => toggleRecipient(contact)} className="h-4 w-4 rounded accent-[var(--accent)]" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-slate-900 dark:text-white">{contact.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{contact.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><Mail size={13} aria-hidden="true" />{contact.email || "No email"}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MessageCircle size={13} aria-hidden="true" />{contact.whatsapp || "No WhatsApp"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${contact.contactType === "manual" ? contact.active === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : contact.status === "active" && contact.approvalStatus === "approved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                        {contact.contactType === "manual" ? contact.active === false ? "Archived" : "Offline" : contact.approvalStatus === "approved" ? contact.status : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {contact.email && <Mail size={14} aria-label="Email available" />}
                        {contact.whatsapp && <MessageCircle size={14} aria-label="WhatsApp available" />}
                        {!contact.email && !contact.whatsapp && "No contact"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filteredContacts.length && <tr><td colSpan="5" className="px-4 py-12 text-center text-sm text-slate-500">No contacts match this audience.</td></tr>}
              </tbody>
            </table>
          </div>
          {selectedTemplate && recipientRecords.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h4 className="text-sm font-bold">Ready to send</h4><p className="mt-1 text-xs text-slate-500">{recipientRecords.length} recipients selected · {selectedTemplate.name}</p></div>
                {(selectedTemplate.channel === "email" || selectedTemplate.channel === "both") && emailRecipients.length > 0 && (
                  <button type="button" disabled={busy} onClick={sendEmails} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50">
                    <Mail size={15} /> {busy ? "Sending…" : `Send email to ${emailRecipients.length} selected agent${emailRecipients.length === 1 ? "" : "s"}`}
                  </button>
                )}
              </div>
              {emailResult && <p role="status" className="text-sm font-medium text-slate-600 dark:text-slate-300">{emailResult}</p>}
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {recipientRecords.map((contact) => {
                  const message = personalize(selectedTemplate.message, contact);
                  const whatsapp = whatsappUrl(contact.whatsapp, message);
                  return (
                    <div key={`${contact.contactType}:${contact._id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
                      <span className="truncate text-sm font-medium">{contact.name}</span>
                      <span className="flex gap-2">
                        {(selectedTemplate.channel === "whatsapp" || selectedTemplate.channel === "both") && (
                          <a aria-disabled={!whatsapp} href={whatsapp || undefined} target="_blank" rel="noreferrer" onClick={(event) => { if (!whatsapp) event.preventDefault(); }} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${whatsapp ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}><MessageCircle size={14} /> WhatsApp</a>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Emails are sent using the configured email service. WhatsApp opens a prepared chat for each selected agent so you can review and send it there.</p>
            </div>
          )}
        </section>
      ) : activeTab === "notifications" && isSuperAdmin ? (
        <AdminNotifications />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="font-bold">Agent conversations</h3><p className="mt-1 text-xs text-slate-500">Text-only messages from the platform chat.</p></div>
              <button type="button" onClick={refreshInbox} aria-label="Refresh inbox" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw size={16} /></button>
            </div>
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button type="button" key={conversation._id} onClick={() => loadThread(conversation).catch((loadError) => { console.error("Support thread load failed:", loadError); toastError("Could not load this conversation."); })} className={`w-full rounded-xl border p-3 text-left ${selectedConversation?._id === conversation._id ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.06)]" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}>
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{conversation.user?.name || "Former agent"}</span><span className="shrink-0 text-[10px] text-slate-500">{formatDate(conversation.lastMessageAt)}</span></span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{conversation.lastMessage}</span>
                </button>
              ))}
              {!conversations.length && <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-950">No agent messages yet. Messages sent through the platform chatbot will appear here.</p>}
            </div>
          </section>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div><h3 className="font-bold">{selectedConversation?.user?.name || "Select a conversation"}</h3><p className="mt-1 text-sm text-slate-500">{selectedConversation?.user?.email || "Choose an agent on the left to read and reply."}</p></div>
            {selectedConversation && (
              <>
                <MessageThread messages={messages} currentUserId={userId} />
                <form onSubmit={sendReply} className="flex items-end gap-2">
                  <label className="sr-only" htmlFor="support-reply">Text reply</label>
                  <textarea id="support-reply" required maxLength={2000} rows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a text reply…" className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
                  <button type="submit" disabled={busy || !reply.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50"><Send size={16} /> Reply</button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
