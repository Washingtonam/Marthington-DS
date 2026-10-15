import React from "react";
import { MessageCircle } from "lucide-react";

export default function SupportChatPage() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(var(--accent-rgb),0.1)] text-[var(--accent-text)]">
        <MessageCircle size={24} aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Chat with support</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
        Send our team a message right here on the platform. You can leave this page and come back later to read our reply.
      </p>
      <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Open the chat using the <MessageCircle size={15} className="mx-1 inline" aria-hidden="true" /> support button in the bottom-right corner of the page.
      </p>
    </section>
  );
}
