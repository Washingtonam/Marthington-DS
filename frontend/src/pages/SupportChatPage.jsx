import React from "react";
import { MessageCircle } from "lucide-react";
import SupportChatWidget from "../components/SupportChatWidget";

export default function SupportChatPage() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(var(--accent-rgb),0.1)] text-[var(--accent-text)]">
        <MessageCircle size={24} aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Chat with support</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
        Message our support team here and return later to read their reply.
      </p>
      <div className="mt-6">
        <SupportChatWidget inline />
      </div>
    </section>
  );
}
