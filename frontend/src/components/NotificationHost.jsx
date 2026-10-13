import { useEffect, useState } from "react";
import { Bell, CircleAlert, Info, CheckCircle2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import api from "../lib/axios";

const dismissedKey = (notification) => {
  if (notification.displayMode !== "oncePerUser") return `notification-dismissed:${notification._id}`;
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return `notification-dismissed:${notification._id}:${user.id || user._id || user.email || "anonymous"}`;
  } catch {
    return `notification-dismissed:${notification._id}:anonymous`;
  }
};

const iconByType = {
  info: <Info size={20} />,
  warning: <CircleAlert size={20} />,
  critical: <CircleAlert size={20} />,
  success: <CheckCircle2 size={20} />,
};

const colorByType = {
  info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/70 dark:text-blue-100",
  warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/70 dark:text-amber-100",
  critical: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/70 dark:text-red-100",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/70 dark:text-emerald-100",
};

export default function NotificationHost() {
  const location = useLocation();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (location.pathname.startsWith("/admin")) {
      return () => { cancelled = true; };
    }

    const fetchNotification = async () => {
      try {
        const response = await api.get("/api/notifications/active", {
          params: { path: location.pathname, service: location.pathname },
        });
        const available = (response.data?.notifications || []).filter((item) => {
          if (item.displayMode === "oncePerSession") return !sessionStorage.getItem(dismissedKey(item));
          if (item.displayMode === "oncePerUser") return !localStorage.getItem(dismissedKey(item));
          return true;
        });
        if (!cancelled) setNotification(available[0] ? { ...available[0], __path: location.pathname } : null);
      } catch {
        if (!cancelled) setNotification(null);
      }
    };

    fetchNotification();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (!notification || notification.__path !== location.pathname || location.pathname.startsWith("/admin")) return null;

  const dismiss = () => {
    if (notification.displayMode === "oncePerSession") sessionStorage.setItem(dismissedKey(notification), "true");
    if (notification.displayMode === "oncePerUser") localStorage.setItem(dismissedKey(notification), "true");
    setNotification(null);
  };

  return (
    <aside className={`fixed right-4 top-20 z-40 w-[min(420px,calc(100vw-2rem))] rounded-2xl border p-5 shadow-2xl ${colorByType[notification.type] || colorByType.info}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{iconByType[notification.type] || iconByType.info}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3"><h2 className="font-bold">{notification.title}</h2>{notification.dismissible && <button onClick={dismiss} className="-mr-2 -mt-2 rounded-lg p-2 opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss notification"><X size={18} /></button>}</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 opacity-90">{notification.message}</p>
          {notification.dismissible && <button onClick={dismiss} className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"><Bell size={15} /> Got it</button>}
        </div>
      </div>
    </aside>
  );
}
