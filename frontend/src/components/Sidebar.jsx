import React, { createElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BadgeDollarSign,
  BookOpenText,
  BriefcaseBusiness,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
  MessageCircle,
  PanelLeftClose,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../lib/axios";
import { useUser } from "../context/UserContext";
import { useBranding } from "../context/BrandingContext";
import { useToast } from "../context/ToastContext";
import SidebarNavItem from "./Sidebar/SidebarNavItem";
import SidebarNavSection from "./Sidebar/SidebarNavSection";

const userGroups = [
  {
    id: "overview",
    title: "Overview",
    icon: LayoutDashboard,
    links: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "services",
    title: "Services",
    icon: BriefcaseBusiness,
    links: [
      { to: "/verify-bvn", label: "Verify BVN", icon: ShieldCheck },
    ],
  },
  {
    id: "activity",
    title: "Activity",
    icon: ScrollText,
    links: [
      { to: "/my-requests", label: "Service Requests", icon: BriefcaseBusiness },
      { to: "/my-verification-requests", label: "Verification Requests", icon: ShieldCheck },
      { to: "/transactions", label: "Transactions", icon: ScrollText },
    ],
  },
  {
    id: "account",
    title: "Account",
    icon: Wallet,
    links: [
      { to: "/wallet", label: "Wallet", icon: Wallet },
      { to: "/commissions", label: "Commissions", icon: BadgeDollarSign },
      { to: "/support-chat", label: "Chat with support", icon: MessageCircle },
      { to: "/profile", label: "Profile & settings", icon: Settings },
    ],
  },
];

const adminGroups = [
  {
    id: "admin-overview",
    title: "Overview",
    icon: LayoutDashboard,
    links: [{ to: "/admin", label: "Admin dashboard", icon: LayoutDashboard }],
  },
  {
    id: "operations",
    title: "Operations",
    icon: Activity,
    links: [
      { to: "/admin/payments", label: "Payment requests", icon: CreditCard },
      { to: "/admin/financial-reports", label: "Financial reports", icon: BadgeDollarSign, superAdminOnly: true },
      { to: "/admin/requests", label: "Service requests", icon: BriefcaseBusiness },
      { to: "/admin/verification-requests", label: "Verification requests", icon: ShieldCheck },
    ],
  },
  {
    id: "management",
    title: "Management",
    icon: Settings,
    links: [
      { to: "/admin/users", label: "User management", icon: Users, superAdminOnly: true },
      { to: "/admin/services-engine", label: "Services Management", icon: SlidersHorizontal, superAdminOnly: true },
      { to: "/admin/communications", label: "Communications", icon: MessageCircle },
      { to: "/admin/articles", label: "Guides & updates", icon: BookOpenText, superAdminOnly: true },
      { to: "/admin/settings", label: "General settings", icon: Settings, superAdminOnly: true },
      { to: "/admin/agents", label: "Agents", icon: Users, superAdminOnly: true },
      { to: "/admin/agents/jobs", label: "Log jobs", icon: BriefcaseBusiness, superAdminOnly: true },
    ],
  },
];

export default function Sidebar({ open, isMobile, collapsed = false, onClose, onToggleCollapse }) {
  const { user, clearUser } = useUser();
  const { businessName, businessTagline, businessLogoUrl } = useBranding();
  const { info: toastInfo } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminWorkspace = location.pathname.startsWith("/admin");
  const isSuperAdmin = user?.role === "super_admin";
  const userRole = user?.role;
  const [serviceCategories, setServiceCategories] = useState([]);
  const [verifyNinEnabled, setVerifyNinEnabled] = useState(true);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const previousSupportMessages = useRef(null);
  const [openGroups, setOpenGroups] = useState(() => new Set(
    [...userGroups, ...adminGroups].map((group) => group.id),
  ));
  const showLabels = !collapsed || isMobile;
  const visible = !isMobile || open;
  const visibleSupportUnreadCount = !isAdminWorkspace && location.pathname === "/support-chat"
    ? 0
    : unreadSupportCount;

  useEffect(() => {
    let cancelled = false;
    api.get("/api/services/categories").then((response) => {
      if (!cancelled) {
        setServiceCategories(Array.isArray(response.data?.categories) ? response.data.categories : []);
      }
    }).catch((error) => {
      console.error("Sidebar categories fetch failed:", error?.message || error);
    });
    api.get("/api/pricing").then((response) => {
      if (!cancelled) {
        setVerifyNinEnabled(response.data?.platformServices?.verifyNin?.enabled !== false);
      }
    }).catch((error) => {
      console.error("Sidebar platform services fetch failed:", error?.message || error);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAdminWorkspace || !["admin", "super_admin"].includes(userRole)) return undefined;
    let cancelled = false;
    const fetchPayments = async () => {
      let response;
      try {
        response = await api.get("/api/admin/payments");
      } catch (primaryError) {
        try {
          response = await api.get("/api/finance/payments");
        } catch (fallbackError) {
          console.error("Sidebar payment count fetch failed:", fallbackError?.message || primaryError?.message);
          return;
        }
      }

      const payments = response.data?.data || response.data || [];
      if (!cancelled && Array.isArray(payments)) {
        setPendingPayments(payments.filter((payment) => payment?.status === "pending").length);
      }
    };
    fetchPayments();
    return () => { cancelled = true; };
  }, [isAdminWorkspace, userRole]);

  useEffect(() => {
    if (isAdminWorkspace && !["admin", "super_admin"].includes(userRole)) return undefined;
    let cancelled = false;
    const fetchUnreadSupport = async () => {
      try {
        let incoming = [];
        let unreadCount = 0;
        if (isAdminWorkspace) {
          const response = await api.get("/api/admin/communications/conversations");
          const conversations = response.data?.conversations || [];
          unreadCount = conversations.reduce((total, conversation) => total + Number(conversation.unreadCount || 0), 0);
          incoming = conversations
            .filter((conversation) => Number(conversation.unreadCount) > 0 && conversation.lastUserMessageAt)
            .map((conversation) => ({
              id: `admin:${conversation._id}`,
              at: String(conversation.lastUserMessageId || new Date(conversation.lastUserMessageAt).getTime()),
              title: conversation.user?.name || "An agent",
            }));
        } else {
          const response = await api.get("/api/communications/conversation/unread-count");
          unreadCount = Number(response.data?.unreadCount || 0);
          if (unreadCount && response.data?.latestMessageAt) {
            incoming = [{
              id: "user:support",
              at: String(response.data.latestMessageId || new Date(response.data.latestMessageAt).getTime()),
              title: "Support",
              preview: "Support has replied to your message.",
            }];
          }
        }
        if (cancelled) return;
        setUnreadSupportCount(unreadCount);
        const previous = previousSupportMessages.current;
        const next = new Map(incoming.map((message) => [message.id, message.at]));
        const newMessages = incoming.filter((message) => previous?.get(message.id) !== message.at);
        previousSupportMessages.current = next;
        newMessages.forEach((message) => {
          const description = isAdminWorkspace
            ? `New support message from ${message.title}. Open Communications to read it.`
            : "Support has replied to your message. Open Chat with support to read it.";
          toastInfo(description, 7000);
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            const notification = new Notification("New support message", {
              body: isAdminWorkspace ? `A new message from ${message.title}.` : "Support has replied to your message.",
            });
            notification.onclick = () => {
              window.focus();
              window.location.href = isAdminWorkspace ? "/admin/communications?tab=inbox" : "/support-chat";
            };
          }
        });
      } catch (error) {
        console.error("Sidebar support notification count fetch failed:", error?.message || error);
      }
    };
    void fetchUnreadSupport();
    const interval = window.setInterval(fetchUnreadSupport, 5000);
    window.addEventListener("support-conversation-read", fetchUnreadSupport);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("support-conversation-read", fetchUnreadSupport);
    };
  }, [isAdminWorkspace, location.pathname, toastInfo, userRole]);

  const groups = useMemo(() => {
    if (isAdminWorkspace) {
      return adminGroups.map((group) => ({
        ...group,
        links: group.links.filter((link) => !link.superAdminOnly || isSuperAdmin)
          .map((link) => {
            if (link.to === "/admin/payments") return { ...link, badge: pendingPayments };
            if (link.to === "/admin/communications") return { ...link, badge: visibleSupportUnreadCount };
            return link;
          }),
      })).filter((group) => group.links.length > 0);
    }

    const categories = serviceCategories.filter((category) => category?.slug).map((category) => {
      const slug = String(category.slug).toLowerCase();
      if (slug === "nin" || slug === "nimc") {
        return { to: "/nin-services", label: `${category.label} services`, icon: BriefcaseBusiness };
      }
      if (slug === "cac") {
        return { to: "/cac-services", label: `${category.label} services`, icon: BriefcaseBusiness };
      }
      return { to: `/services/${slug}`, label: `${category.label} services`, icon: BriefcaseBusiness };
    });
    const platformLinks = verifyNinEnabled
      ? [{ to: "/verify-nin", label: "Verify NIN", icon: ShieldCheck }]
      : [];
    return userGroups.map((group) => group.id === "services"
      ? { ...group, links: [...platformLinks, ...group.links, ...categories] }
      : group.id === "account"
        ? { ...group, links: group.links.map((link) => link.to === "/support-chat" ? { ...link, badge: visibleSupportUnreadCount } : link) }
        : group);
  }, [isAdminWorkspace, isSuperAdmin, pendingPayments, serviceCategories, verifyNinEnabled, visibleSupportUnreadCount]);

  const handleLogout = () => {
    clearUser();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      id="app-sidebar"
      role={isMobile && open ? "dialog" : undefined}
      aria-modal={isMobile && open ? true : undefined}
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
      aria-label={isAdminWorkspace ? `${isSuperAdmin ? "Super Admin" : "Admin"} navigation` : "User navigation"}
      className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white shadow-xl transition-[width,transform] duration-200 dark:border-slate-800 dark:bg-slate-950 ${
        isMobile
          ? `w-[min(18rem,calc(100vw-2rem))] ${open ? "translate-x-0" : "-translate-x-full"}`
          : `${collapsed ? "w-20" : "w-72"} translate-x-0`
      }`}
    >
      <div className={`flex h-20 shrink-0 items-center border-b border-slate-200 dark:border-slate-800 ${
        collapsed && !isMobile ? "justify-center px-0" : "gap-3 px-5"
      }`}>
        {collapsed && !isMobile ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            aria-expanded={false}
            aria-controls="app-sidebar"
            title="Expand sidebar"
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgba(var(--accent-rgb),0.10)] text-[var(--accent-text)] transition hover:ring-2 hover:ring-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {businessLogoUrl
              ? <img src={businessLogoUrl} alt="" className="h-full w-full object-contain p-1" />
              : <Activity size={21} aria-hidden="true" />}
          </button>
        ) : (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgba(var(--accent-rgb),0.10)] text-[var(--accent-text)]">
              {businessLogoUrl
                ? <img src={businessLogoUrl} alt="" className="h-full w-full object-contain p-1" />
                : <Activity size={21} aria-hidden="true" />}
            </div>
        {showLabels && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">{businessName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{businessTagline}</p>
          </div>
        )}
            {!isMobile && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                aria-expanded={true}
                aria-controls="app-sidebar"
                title="Collapse sidebar"
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <PanelLeftClose size={18} aria-hidden="true" />
              </button>
            )}
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar drawer"
            data-drawer-close
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={19} aria-hidden="true" />
          </button>
        )}
          </>
        )}
      </div>

      <nav className={`min-h-0 flex-1 space-y-5 overflow-y-auto py-5 ${showLabels ? "px-3" : "px-1.5"}`} aria-label="Dashboard">
        {groups.map((group) => {
          const GroupIcon = group.icon;
          const expanded = openGroups.has(group.id);
          return (
            <SidebarNavSection
              key={group.id}
              id={group.id}
              title={group.title}
              icon={<GroupIcon size={18} aria-hidden="true" />}
              open={showLabels}
              expanded={expanded}
              onToggle={() => setOpenGroups((current) => {
                const next = new Set(current);
                if (next.has(group.id)) next.delete(group.id);
                else next.add(group.id);
                return next;
              })}
            >
              {group.links.map(({ to, label, icon: Icon, badge }) => (
                <SidebarNavItem
                  key={to}
                  to={to}
                  label={label}
                  icon={createElement(Icon, { size: 18, "aria-hidden": true })}
                  badge={badge}
                  open={showLabels}
                  onNavigate={() => { if (isMobile) onClose(); }}
                />
              ))}
            </SidebarNavSection>
          );
        })}
      </nav>

      <div className={`border-t border-slate-200 dark:border-slate-800 ${showLabels ? "p-3" : "p-1.5"}`}>
        <button
          type="button"
          onClick={handleLogout}
          title={showLabels ? undefined : "Sign out"}
          aria-label="Sign out"
          className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${
            showLabels ? "gap-3" : "justify-center"
          }`}
        >
          <LogOut size={18} aria-hidden="true" />
          {showLabels && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
