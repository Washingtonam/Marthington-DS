import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  Moon,
  Sun,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import WorkspaceSwitcher from "../components/WorkspaceSwitcher";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { useBranding } from "../context/BrandingContext";
import { formatNaira } from "../lib/currency";
import SupportChatWidget from "../components/SupportChatWidget";

const pageTitles = [
  ["/dashboard", "Dashboard"],
  ["/profile", "Profile & settings"],
  ["/verify-nin", "Verify NIN"],
  ["/verify-bvn", "Verify BVN"],
  ["/verify-result", "Verification result"],
  ["/my-requests", "Service requests"],
  ["/my-verification-requests", "Verification requests"],
  ["/wallet", "Wallet"],
  ["/transactions", "Transactions"],
  ["/contact", "Contact support"],
  ["/support-chat", "Chat with support"],
  ["/nin-services", "NIN services"],
  ["/cac-services", "CAC services"],
  ["/services", "Services"],
  ["/admin", "Admin dashboard"],
  ["/admin/users", "Manage users"],
  ["/admin/payments", "Payment requests"],
  ["/admin/requests", "Service requests"],
  ["/admin/verification-requests", "Verification requests"],
  ["/admin/pricing", "Services & pricing"],
  ["/admin/services-engine", "Services & pricing"],
  ["/admin/articles", "Guides & updates"],
  ["/admin/agents/jobs", "Log jobs"],
  ["/admin/agents", "Agents"],
  ["/admin/communications", "Communications"],
  ["/admin/settings", "Business settings"],
  ["/admin/user", "User details"],
];

function getPageTitle(pathname) {
  const match = pageTitles.find(([path]) => (
    pathname === path || (path !== "/admin" && pathname.startsWith(`${path}/`))
  ));
  if (match) return match[1];
  return pathname.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") || "Dashboard";
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, walletBalance, isBalanceLoading, clearUser } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { businessName, businessTagline } = useBranding();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [mobileDrawerPath, setMobileDrawerPath] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const accountMenuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const drawerWasOpen = useRef(false);
  const isAdminWorkspace = location.pathname.startsWith("/admin");
  const mobileOpen = mobileDrawerPath === location.pathname;
  const pageTitle = getPageTitle(location.pathname);

  const closeMobileDrawer = () => {
    setMobileDrawerPath(null);
  };

  useLayoutEffect(() => {
    if (drawerWasOpen.current && !mobileOpen) menuButtonRef.current?.focus();
    drawerWasOpen.current = mobileOpen;
  }, [mobileOpen]);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 1024;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) setMobileDrawerPath(null);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (accountMenuRef.current) accountMenuRef.current.open = false;
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = document.getElementById("app-sidebar");
    const closeButton = sidebar?.querySelector("[data-drawer-close]");
    closeButton?.focus();

    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeMobileDrawer();
    };
    const trapFocus = (event) => {
      if (event.key !== "Tab" || !sidebar) return;
      const focusable = Array.from(sidebar.querySelectorAll(
        'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.closest("[hidden]"));
      if (!focusable.length) {
        event.preventDefault();
        closeButton?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("keydown", trapFocus);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    clearUser();
    navigate("/login", { replace: true });
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Account";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation backdrop"
          tabIndex={-1}
          onClick={closeMobileDrawer}
          aria-hidden="true"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <Sidebar
        open={isMobile ? mobileOpen : true}
        isMobile={isMobile}
        collapsed={collapsed}
        onClose={closeMobileDrawer}
      />

      <main className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ${
        collapsed ? "lg:pl-20" : "lg:pl-72"
      }`}>
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex min-h-[4.5rem] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              ref={menuButtonRef}
              onClick={() => isMobile
                ? mobileOpen ? closeMobileDrawer() : setMobileDrawerPath(location.pathname)
                : setCollapsed((value) => !value)}
              aria-label={isMobile
                ? (mobileOpen ? "Close navigation menu" : "Open navigation menu")
                : (collapsed ? "Open navigation menu" : "Collapse sidebar")}
              aria-expanded={isMobile ? mobileOpen : !collapsed}
              aria-controls="app-sidebar"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              {isMobile
                ? mobileOpen ? <X size={20} /> : <Menu size={20} />
                : collapsed ? <Menu size={20} /> : <PanelLeftClose size={20} />}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">{pageTitle}</h1>
                {isAdminWorkspace && (
                  <span
                    className="hidden rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide sm:inline-flex"
                    style={{
                      backgroundColor: "rgba(var(--accent-rgb), 0.12)",
                      color: "var(--accent-text)",
                    }}
                  >
                    {user?.role === "super_admin" ? "Super Admin" : "Admin"}
                  </span>
                )}
              </div>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                {isAdminWorkspace ? "Administration workspace" : `${businessName} ${businessTagline}`}
              </p>
            </div>

            <WorkspaceSwitcher isAdminWorkspace={isAdminWorkspace} onSwitch={() => setMobileDrawerPath(null)} />

            {!isAdminWorkspace && (
              <Link
                to="/wallet"
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label={`Wallet balance: ${formatNaira(walletBalance ?? 0)}`}
              >
                <Wallet size={16} className="text-[var(--accent)]" aria-hidden="true" />
                <span>{isBalanceLoading ? "Loading" : formatNaira(walletBalance ?? 0)}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex dark:text-slate-300 dark:hover:bg-slate-900"
            >
              {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>

            <details ref={accountMenuRef} className="relative">
              <summary
                aria-label="Open account menu"
                className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-slate-900 [&::-webkit-details-marker]:hidden"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)]" aria-hidden="true">
                  {user?.firstName?.[0]?.toUpperCase() || <UserRound size={17} />}
                </span>
                <span className="hidden max-w-36 text-left md:block">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{displayName}</span>
                  <span className="block truncate text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role?.replace("_", " ") || "Account"}</span>
                </span>
                <ChevronDown size={15} className="hidden text-slate-500 md:block" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <Link to="/profile" onClick={() => { if (accountMenuRef.current) accountMenuRef.current.open = false; }} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 dark:text-slate-200 dark:hover:bg-slate-800">
                  <UserRound size={16} aria-hidden="true" /> Profile & settings
                </Link>
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50 focus-visible:outline-2 dark:text-rose-300 dark:hover:bg-rose-950/40">
                  <LogOut size={16} aria-hidden="true" /> Sign out
                </button>
              </div>
            </details>
          </div>
        </header>

        <div className="min-w-0 w-full flex-1 p-3 animate-fadeIn sm:p-4 md:p-6 lg:p-8">
          {children}
        </div>
        <Footer className="mt-auto" />
      </main>

      <SupportChatWidget />
    </div>
  );
}
