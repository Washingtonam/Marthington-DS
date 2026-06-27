import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function SlideOver({ isOpen, onClose, title, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevActive = document.activeElement;
    const focusable = panelRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        // simple focus-trap
        const nodes = Array.from(focusable || []);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      prevActive?.focus?.();
    };
  }, [isOpen, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      />

      <motion.aside
        ref={panelRef}
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 h-full w-full md:w-[720px] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-2xl pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideover-title"
      >
        <div className="h-full overflow-auto p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && <h3 id="slideover-title" className="text-lg font-bold">{title}</h3>}
            </div>
            <div>
              <button onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">Close</button>
            </div>
          </div>

          <div>
            {children}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
