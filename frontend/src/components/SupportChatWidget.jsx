import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import api from "../lib/axios";

export default function SupportChatWidget() {
  const { user } = useUser();
  const { error: toastError } = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(() => location.pathname === "/support-chat");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  const loadConversation = useCallback(async () => {
    try {
      const response = await api.get("/api/communications/conversation");
      setMessages(response.data?.messages || []);
    } catch (loadError) {
      console.error("Support chat load failed:", loadError);
      toastError(loadError.response?.data?.message || "Could not load your support messages.");
    }
  }, [toastError]);

  useEffect(() => {
    if (!open) return undefined;
    const initialLoad = window.setTimeout(loadConversation, 0);
    const interval = window.setInterval(loadConversation, 10000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadConversation, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const response = await api.post("/api/communications/conversation/messages", { text: text.trim() });
      setMessages((current) => [...current, response.data.message]);
      setText("");
    } catch (sendError) {
      console.error("Support chat send failed:", sendError);
      toastError(sendError.response?.data?.message || "Could not send your message.");
    } finally {
      setBusy(false);
    }
  };

  const toggleChat = () => {
    if (!open) void loadConversation();
    setOpen((current) => !current);
  };

  if (!user || user.role === "admin" || user.role === "super_admin") return null;

  return (
    <>
      {open && (
        <section aria-label="Chat with support" className="fixed bottom-24 right-4 z-40 flex h-[min(34rem,70vh)] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:right-6">
          <header className="flex items-center justify-between bg-[var(--accent)] px-4 py-3 text-[var(--accent-foreground)]">
            <div><h2 className="font-bold">Agent support</h2><p className="text-xs opacity-80">Send us a text message</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support chat" className="rounded-lg p-2 hover:bg-black/10"><X size={18} /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
            {!messages.length && <p className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">Welcome. Send a message and our support team will reply here.</p>}
            {messages.map((message) => {
              const outgoing = String(message.senderId) === String(user.id || user._id);
              return (
                <div key={message._id} className={`max-w-[88%] rounded-2xl px-3 py-2.5 ${outgoing ? "ml-auto bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-white shadow-sm dark:bg-slate-800"}`}>
                  <p className="mb-1 text-[11px] font-semibold opacity-70">{outgoing ? "You" : "Support"}</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.text}</p>
                  <p className="mt-1 text-right text-[10px] opacity-60">{message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ""}</p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
            <label className="sr-only" htmlFor="agent-support-message">Text message</label>
            <textarea id="agent-support-message" value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={2} placeholder="Write a message…" className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send message" className="rounded-xl bg-[var(--accent)] p-3 text-[var(--accent-foreground)] disabled:opacity-50"><Send size={17} /></button>
          </form>
        </section>
      )}
      <button type="button" onClick={toggleChat} aria-label={open ? "Close chat with support" : "Chat with support"} className="fixed bottom-5 right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] shadow-lg transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 sm:bottom-6 sm:right-6">
        {open ? <X size={19} /> : <MessageCircle size={20} />}
        <span>{open ? "Close chat" : "Chat with support"}</span>
      </button>
    </>
  );
}
