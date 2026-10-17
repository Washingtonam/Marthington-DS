import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bell, BriefcaseBusiness, Copy, Mail, MessageCircle, Plus, RefreshCw, Search, Send } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";
import AdminNotifications from "./AdminNotifications";

const emptyTemplate = { name: "", category: "", channel: "email", subject: "", message: "" };

const personalize = (value, contact) => value
  .replaceAll("{{name}}", contact.name || "there")
  .replaceAll("{{email}}", contact.email || "")
  .replaceAll("{{company}}", contact.company || "")
  .replaceAll("{{city}}", contact.city || "");

const whatsappUrl = (phone, message) => {
  let number = String(phone || "").replace(/\D/g, "");
  if (number.startsWith("0")) number = `234${number.slice(1)}`;
  if (number.length < 7 || number.length > 15) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

const formatDate = (date) => date ? new Date(date).toLocaleString() : "";

function MessageThread({ messages, currentUserId, isSuperAdmin, onCopyMessage, onLogJob }) {
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const dismissMenu = (event) => {
      if (!contextMenuRef.current?.contains(event.target)) setContextMenu(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  return (
    <div role="region" aria-label="Conversation messages" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
      {messages.map((message) => {
        const outgoing = String(message.senderId) === String(currentUserId);
        return (
          <div
            key={message._id}
            onContextMenu={isSuperAdmin ? (event) => {
              event.preventDefault();
              setContextMenu({
                message,
                x: Math.min(event.clientX, window.innerWidth - 190),
                y: Math.min(event.clientY, window.innerHeight - 100),
              });
            } : undefined}
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${outgoing ? "self-end bg-[var(--accent)] text-[var(--accent-foreground)]" : "self-start bg-white shadow-sm dark:bg-slate-800"}`}
          >
            <p className="mb-1 text-xs font-semibold opacity-70">{message.senderName}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
            <p className="mt-2 text-right text-[10px] opacity-60">{formatDate(message.createdAt)}</p>
          </div>
        );
      })}
      {!messages.length && <p className="m-auto text-sm text-slate-500">No messages in this conversation yet.</p>}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label="Message actions"
          className="fixed z-50 min-w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button type="button" role="menuitem" onClick={() => { void onCopyMessage(contextMenu.message); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
            <Copy size={15} aria-hidden="true" /> Copy message
          </button>
          <button type="button" role="menuitem" onClick={() => { onLogJob(contextMenu.message); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
            <BriefcaseBusiness size={15} aria-hidden="true" /> Log a job
          </button>
        </div>
      )}
    </div>
  );
}

export default function Communications() {
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSuperAdmin = user?.role === "super_admin";
  const userId = user?.id || user?._id;
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => (
    isSuperAdmin && ["templates", "dispatch", "notifications", "inbox"].includes(requestedTab)
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
  const [desktopPermission, setDesktopPermission] = useState(() => (
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  ));

  const loadConversations = useCallback(async () => {
    const response = await api.get("/api/admin/communications/conversations");
    setConversations(response.data?.conversations || []);
  }, []);

  const loadThread = useCallback(async (conversation) => {
    const response = await api.get(`/api/admin/communications/conversations/${conversation._id}/messages?markRead=true`);
    window.dispatchEvent(new Event("support-conversation-read"));
    setSelectedConversation(response.data.conversation);
    setMessages(response.data.messages || []);
    setConversations((current) => current.map((item) => (
      String(item._id) === String(conversation._id) ? { ...item, unreadCount: 0 } : item
    )));
    await loadConversations();
  }, [loadConversations]);

  const unreadMessageCount = conversations.reduce(
    (total, conversation) => total + Number(conversation.unreadCount || 0),
    0,
  );
  const unreadConversationCount = conversations.filter((conversation) => conversation.unreadCount > 0).length;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const requests = [api.get("/api/admin/communications/conversations")];
        if (isSuperAdmin) {
          requests.push(
            api.get("/api/admin/communications/templates"),
            api.get("/api/admin/agents"),
            api.get("/api/admin/nimc-feps"),
          );
        }
        const [conversationResponse, templateResponse, contactsResponse, fepResponse] = await Promise.all(requests);
        if (cancelled) return;
        setConversations(conversationResponse.data?.conversations || []);
        if (isSuperAdmin) {
          setTemplates(templateResponse.data?.templates || []);
          setContacts([
            ...(contactsResponse.data?.manualAgents || []).map((contact) => ({ ...contact, contactType: "manual", source: "Offline agent" })),
            ...(contactsResponse.data?.registeredUsers || []).map((contact) => ({ ...contact, contactType: "registered", source: "Platform agent" })),
            ...(fepResponse.data?.feps || []).map((contact) => ({
              ...contact,
              company: contact.company || "VOLSUS Energy Limited",
              city: contact.city || "Benin City",
              contactType: "fep",
              source: "NIMC FEP · Benin City",
            })),
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
    if (audience === "fep") return contact.contactType === "fep" && contact.active !== false;
    if (audience === "active") return contact.status === "active" && contact.approvalStatus === "approved";
    if (audience === "wallet") return Number(contact.walletBalanceKobo || contact.walletBalance || 0) > 0;
    if (audience === "inactive") return contact.contactType === "fep"
      ? contact.active === false
      : contact.status !== "active" || contact.approvalStatus !== "approved";
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

  const copyMessage = async (message) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(message.text);
      success("Message copied.");
    } catch (copyError) {
      console.error("Support message copy failed:", copyError);
      toastError("Could not copy this message.");
    }
  };

  const logJobFromMessage = (message) => {
    const agentId = selectedConversation?.user?._id;
    if (!agentId) {
      toastError("This conversation is not linked to a registered agent account.");
      return;
    }
    navigate(`/admin/agents/jobs?customerType=registered&customerId=${encodeURIComponent(agentId)}`, {
      state: { messageText: message.text },
    });
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

  const returnToConversationList = () => {
    setSelectedConversation(null);
    setMessages([]);
    setReply("");
  };

  useEffect(() => {
    const selectedConversationId = selectedConversation?._id;
    const refreshInboxData = async () => {
      try {
        await loadConversations();
        if (activeTab === "inbox" && selectedConversationId) {
          const response = await api.get(`/api/admin/communications/conversations/${selectedConversationId}/messages`);
          setSelectedConversation(response.data.conversation);
          setMessages(response.data.messages || []);
        }
      } catch (refreshError) {
        console.error("Support inbox polling failed:", refreshError);
      }
    };
    const interval = window.setInterval(refreshInboxData, 5000);
    return () => window.clearInterval(interval);
  }, [activeTab, loadConversations, selectedConversation?._id]);

  const enableDesktopNotifications = async () => {
    if (!("Notification" in window)) {
      setDesktopPermission("unsupported");
      return;
    }
    try {
      setDesktopPermission(await Notification.requestPermission());
    } catch (permissionError) {
      console.error("Desktop notification permission failed:", permissionError);
      toastError("Could not enable desktop notifications in this browser.");
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
        {desktopPermission === "default" && (
          <button type="button" onClick={enableDesktopNotifications} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <Bell size={16} aria-hidden="true" /> Enable desktop message alerts
          </button>
        )}
        {desktopPermission === "denied" && <p className="mt-3 text-xs text-slate-500">Desktop alerts are blocked by your browser. Enable them in the site permissions to receive alerts while this tab is in the background.</p>}
        {desktopPermission === "unsupported" && <p className="mt-3 text-xs text-slate-500">This browser does not support desktop message alerts. In-app alerts remain enabled.</p>}
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
        <button type="button" role="tab" aria-selected={activeTab === "inbox"} onClick={() => changeTab("inbox")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "inbox" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
          <span>Support inbox</span>
          <span
            aria-live="polite"
            title={`${unreadMessageCount} unread messages in ${unreadConversationCount} ${unreadConversationCount === 1 ? "conversation" : "conversations"}`}
            className={`inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
              unreadMessageCount > 0
                ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-200 dark:ring-rose-900"
                : activeTab === "inbox"
                  ? "bg-white/20 text-[var(--accent-foreground)]"
                  : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
            }`}
          >
            {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
          </span>
        </button>
      </div>

      {activeTab === "inbox" && unreadMessageCount > 0 && (
        <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p>
            <strong>{unreadMessageCount} unread {unreadMessageCount === 1 ? "message" : "messages"} across {unreadConversationCount} {unreadConversationCount === 1 ? "chat" : "chats"}.</strong>
            {" "}
            {conversations
              .filter((conversation) => conversation.unreadCount > 0)
              .map((conversation) => conversation.user?.name || "An agent")
              .join(", ")}
          </p>
          <span className="font-semibold">Unread chats are marked and listed first.</span>
        </div>
      )}

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
              <p className="mt-1 text-sm text-slate-500">Choose a saved template and audience, then select agents or FEPs to contact.</p>
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
                  <option value="all">All contacts</option><option value="active">Active platform agents</option><option value="wallet">Accounts with wallet funds</option><option value="inactive">Inactive / pending accounts</option><option value="manual">Offline agents</option><option value="fep">Active NIMC FEPs · Benin City</option>
                </select>
              </label>
              <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
                <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search communication recipients" placeholder="Search agents and FEPs…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                <span className="shrink-0 text-xs text-slate-500">{selectedRecipients.length} selected</span>
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3"><span className="sr-only">Select</span></th>
                  <th scope="col" className="px-4 py-3">Recipient</th>
                  <th scope="col" className="px-4 py-3">Contact details</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredContacts.map((contact) => {
                const key = `${contact.contactType}:${contact._id}`;
                const channelAvailable = !selectedTemplate || selectedTemplate.channel === "both"
                  ? Boolean(contact.email || contact.whatsapp)
                  : selectedTemplate.channel === "email"
                    ? Boolean(contact.email)
                    : Boolean(contact.whatsapp);
                const usable = channelAvailable && !(contact.contactType === "fep" && contact.active === false);
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
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${contact.contactType === "fep" ? contact.active === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" : contact.contactType === "manual" ? contact.active === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : contact.status === "active" && contact.approvalStatus === "approved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                        {contact.contactType === "fep" ? contact.active === false ? "Archived" : "NIMC FEP" : contact.contactType === "manual" ? contact.active === false ? "Archived" : "Offline" : contact.approvalStatus === "approved" ? contact.status : "Pending"}
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
                    <Mail size={15} /> {busy ? "Sending…" : `Send email to ${emailRecipients.length} selected recipient${emailRecipients.length === 1 ? "" : "s"}`}
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
          <section className={`${selectedConversation ? "hidden md:block" : "block"} rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="font-bold">Agent conversations</h3><p className="mt-1 text-xs text-slate-500">Text-only messages from the platform chat.</p></div>
              <button type="button" onClick={refreshInbox} aria-label="Refresh inbox" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw size={16} /></button>
            </div>
              <div className="max-h-[min(65vh,42rem)] space-y-2 overflow-y-auto">
                {[...conversations]
                  .sort((left, right) => Number(right.unreadCount > 0) - Number(left.unreadCount > 0))
                  .map((conversation) => (
                    <button type="button" key={conversation._id} onClick={() => loadThread(conversation).catch((loadError) => { console.error("Support thread load failed:", loadError); toastError("Could not load this conversation."); })} className={`w-full rounded-xl border p-3 text-left ${conversation.unreadCount > 0 ? "border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"} ${selectedConversation?._id === conversation._id ? "ring-2 ring-[var(--accent)]" : ""}`}>
                      <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{conversation.user?.name || "Former agent"}</span><span className="flex shrink-0 items-center gap-2 text-[10px] text-slate-500">{conversation.unreadCount > 0 && <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 py-1 font-bold leading-none text-white" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>}{formatDate(conversation.lastMessageAt)}</span></span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{conversation.lastMessage}</span>
                    </button>
                  ))}
                {!conversations.length && <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-950">No agent messages yet. Messages sent through the platform chatbot will appear here.</p>}
              </div>
          </section>
          <section className={`${selectedConversation ? "block" : "hidden md:flex"} h-[min(68dvh,42rem)] min-h-[22rem] flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5`}>
            <div className="flex shrink-0 items-center gap-3">
              {selectedConversation && (
                <button type="button" onClick={returnToConversationList} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 md:hidden">
                  <ArrowLeft size={16} aria-hidden="true" /> Inbox
                </button>
              )}
              <div className="min-w-0"><h3 className="truncate font-bold">{selectedConversation?.user?.name || "Select a conversation"}</h3><p className="mt-1 truncate text-sm text-slate-500">{selectedConversation?.user?.email || "Choose an agent on the left to read and reply."}</p></div>
            </div>
            {selectedConversation && (
              <>
                <MessageThread messages={messages} currentUserId={userId} isSuperAdmin={isSuperAdmin} onCopyMessage={copyMessage} onLogJob={logJobFromMessage} />
                <form onSubmit={sendReply} className="flex shrink-0 items-end gap-2">
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
