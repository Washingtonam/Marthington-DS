import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function SlideOver({ isOpen, onClose, title, children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousActive = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const firstInput = panel?.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    const closeButton = panel?.querySelector("[data-dialog-close]");
    (firstInput || closeButton)?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll(focusableSelector))
        .filter((element) => !element.closest("[hidden]"));
      if (!focusable.length) {
        event.preventDefault();
        closeButton?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-3 sm:p-6">
          <motion.button
            type="button"
            aria-label="Close dialog backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
          />
          <motion.section
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="relative z-[1] my-auto max-h-[min(88vh,900px)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slideover-title"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-7">
              <h2 id="slideover-title" className="text-lg font-bold tracking-tight">{title}</h2>
              <button
                type="button"
                data-dialog-close
                onClick={onClose}
                aria-label="Close dialog"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 sm:p-7">{children}</div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
