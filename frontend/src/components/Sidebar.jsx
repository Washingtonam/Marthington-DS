import {
  LayoutDashboard,
  ShieldCheck,
  Wallet,
  ScrollText,
  Users,
  CreditCard,
  Settings,
  Bell,
  Menu,
  X,
  Briefcase,
  Sparkles,
  Building2,
  Sliders,
} from "lucide-react";

import { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";

import SidebarNavItem from "./Sidebar/SidebarNavItem";
import SidebarUserCard from "./Sidebar/SidebarUserCard";
import SidebarNavSection from "./Sidebar/SidebarNavSection";
import SidebarFooter from "./Sidebar/SidebarFooter";

const API_BASE = "https://xcombinator.onrender.com";

/**
 * Sidebar - Main navigation component
 * Collapsible sidebar with user profile, navigation sections, and admin controls
 * Features: theme toggle, logout, badge notifications, responsive design
 */
export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();

  const [open, setOpen] = useState(window.innerWidth >= 1024);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  const token = localStorage.getItem("token")?.replace(/['"]+/g, "") || "";
  const headers = {
    email: user?.email || "",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Toggle sidebar and notify Layout.jsx
  const toggleSidebar = () => {
    const nextState = !open;
    setOpen(nextState);
    window.dispatchEvent(
      new CustomEvent("sidebar-toggle", { detail: nextState })
    );
  };

  // Handle responsive sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      const isLarge = window.innerWidth >= 1024;
      setOpen(isLarge);
      window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: isLarge }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Fetch admin notification counts
  useEffect(() => {
    if (!isAdmin) return;

    const fetchCounts = async () => {
      try {
        let paymentsData = [];
        try {
          const payRes = await axios.get(`${API_BASE}/api/admin/payments`, {
            headers,
          });
          paymentsData = payRes.data?.data || payRes.data || [];
        } catch (err) {
          try {
            const alt = await axios.get(`${API_BASE}/api/finance/payments`, {
              headers,
            });
            paymentsData = alt.data?.data || alt.data || [];
          } catch (err2) {
            console.error("Payments fetch failed:", err?.message);
            paymentsData = [];
          }
        }

        if (Array.isArray(paymentsData)) {
          setPendingPayments(
            paymentsData.filter((p) => p && p.status === "pending").length
          );
        } else {
          setPendingPayments(0);
        }

        setPendingRequests(0);
      } catch (err) {
        console.error("Sidebar fetch error:", err.message);
        setPendingPayments(0);
        setPendingRequests(0);
      }
    };

    fetchCounts();
  }, [isAdmin, headers]);

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-3 rounded-2xl shadow-2xl hover:scale-105 transition"
        aria-label="Toggle sidebar"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop */}
      {open && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 transition-all duration-300 overflow-hidden ${
          open ? "translate-x-0 w-[310px]" : "-translate-x-full lg:translate-x-0 lg:w-[85px]"
        }`}
      >
        <div className="h-full overflow-y-auto bg-gradient-to-b from-[#020617] via-[#0F172A] to-[#172554] text-white flex flex-col justify-between border-r border-white/10 shadow-2xl scrollbar-none">
          {/* Content */}
          <div className="p-6 pt-20">
            {/* Logo */}
            <div className="flex items-center justify-between mb-8 overflow-hidden h-10">
              <div className="transition-all duration-300">
                {open ? (
                  <img
                    src="/logofull.png"
                    alt="Marthington"
                    className="h-10 object-contain animate-fadeIn"
                  />
                ) : (
                  <Sparkles size={28} className="text-blue-400 ml-1.5" />
                )}
              </div>
            </div>

            {/* User Card */}
            <SidebarUserCard
              user={user}
              isSuperAdmin={isSuperAdmin}
              open={open}
            />

            {/* Main Navigation */}
            <SidebarNavSection title="Navigation" dotColor="blue" open={open}>
              <SidebarNavItem
                to="/dashboard"
                label="Dashboard"
                icon={<LayoutDashboard size={18} />}
                open={open}
                onNavigate={handleNavClick}
              />
              <SidebarNavItem
                to="/verify-nin"
                label="Verify NIN"
                icon={<ShieldCheck size={18} />}
                open={open}
                onNavigate={handleNavClick}
              />
              <SidebarNavItem
                to="/nin-services"
                label="NIMC Services"
                icon={<Briefcase size={18} />}
                open={open}
                onNavigate={handleNavClick}
              />
              <SidebarNavItem
                to="/cac-services"
                label="CAC Services"
                icon={<Building2 size={18} />}
                open={open}
                onNavigate={handleNavClick}
              />
              <SidebarNavItem
                to="/wallet"
                label="Wallet"
                icon={<Wallet size={18} />}
                open={open}
                onNavigate={handleNavClick}
              />
              <SidebarNavItem
                to="/transactions"
                label="Transactions"
                icon={<ScrollText size={18} />}
                open={open}
                onNavigate={handleNavClick}
              />
              <SidebarNavItem
                to="/my-requests"
                label="Service Requests"
                icon={<Briefcase size={18} />}
                open={open}
                onNavigate={handleNavClick}
              />
              <SidebarNavItem
                to="/my-verification-requests"
                label="Verification Requests"
                icon={<ShieldCheck size={18} />}
                open={open}
                onNavigate={handleNavClick}
              />
            </SidebarNavSection>

            {/* Admin Navigation */}
            {isAdmin && (
              <div className="mt-8">
                <SidebarNavSection
                  title="Admin"
                  dotColor="yellow"
                  open={open}
                >
                  <SidebarNavItem
                    to="/admin"
                    label="Admin Dashboard"
                    icon={<Settings size={18} />}
                    open={open}
                    onNavigate={handleNavClick}
                  />
                  {isSuperAdmin && (
                    <SidebarNavItem
                      to="/admin/users"
                      label="Manage Users"
                      icon={<Users size={18} />}
                      open={open}
                      onNavigate={handleNavClick}
                    />
                  )}
                  <SidebarNavItem
                    to="/admin/payments"
                    label="Payment Requests"
                    icon={<CreditCard size={18} />}
                    badge={pendingPayments}
                    open={open}
                    onNavigate={handleNavClick}
                  />
                  <SidebarNavItem
                    to="/admin/requests"
                    label="Service Requests"
                    icon={<Bell size={18} />}
                    badge={pendingRequests}
                    open={open}
                    onNavigate={handleNavClick}
                  />
                  <SidebarNavItem
                    to="/admin/verification-requests"
                    label="Verification Requests"
                    icon={<ShieldCheck size={18} />}
                    open={open}
                    onNavigate={handleNavClick}
                  />
                  {isSuperAdmin && (
                    <SidebarNavItem
                      to="/admin/pricing"
                      label="Pricing Engine"
                      icon={<Sliders size={18} />}
                      open={open}
                      onNavigate={handleNavClick}
                    />
                  )}
                </SidebarNavSection>
              </div>
            )}
          </div>

          {/* Footer */}
          <SidebarFooter
            open={open}
            theme={theme}
            onToggleTheme={toggleTheme}
            onLogout={handleLogout}
          />
        </div>
      </aside>
    </>
  );
}