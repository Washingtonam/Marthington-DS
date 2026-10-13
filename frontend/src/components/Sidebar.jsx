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
  Sliders,
  BookOpenText,
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
export default function Sidebar({ open, isMobile, onToggle, onClose }) {
  const { theme, toggleTheme } = useTheme();

  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [serviceCategories, setServiceCategories] = useState([]);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  const token = localStorage.getItem("token")?.replace(/['"]+/g, "") || "";
  const headers = {
    email: user?.email || "",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

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
            console.error("Payments fetch failed:", err2?.message || err?.message);
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

  useEffect(() => {
    const fetchServiceCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/services/categories`, { headers });
        setServiceCategories(Array.isArray(response.data?.categories) ? response.data.categories : []);
      } catch (err) {
        console.error("Sidebar categories fetch failed:", err?.message || err);
        setServiceCategories([]);
      }
    };

    fetchServiceCategories();
  }, [token]);

  const handleNavClick = () => {
    if (isMobile) onClose();
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed left-4 top-4 z-[60] rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-3 text-white shadow-2xl transition hover:scale-105"
        aria-label={isMobile ? (open ? "Close navigation menu" : "Open navigation menu") : (open ? "Collapse sidebar" : "Expand sidebar")}
        aria-expanded={open}
        aria-controls="app-sidebar"
      >
        {isMobile && open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop */}
      {isMobile && open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        id="app-sidebar"
        className={`fixed left-0 top-0 z-50 h-screen overflow-hidden transition-all duration-300 ${
          open
            ? "w-[min(310px,calc(100vw-3rem))] translate-x-0 lg:w-[310px]"
            : "-translate-x-full lg:w-[85px] lg:translate-x-0"
        }`}
      >
        <div className="h-full overflow-y-auto bg-gradient-to-b from-[#020617] via-[#0F172A] to-[#172554] text-white flex flex-col justify-between border-r border-white/10 shadow-2xl scrollbar-none">
          {/* Content */}
          <div className={`${open ? "p-6" : "p-2"} pt-20`}>
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
              {serviceCategories.map((category) => (
                <SidebarNavItem
                  key={category.slug}
                  to={`/services/${category.slug}`}
                  label={`${category.label} Services`}
                  icon={<Briefcase size={18} />}
                  open={open}
                  onNavigate={handleNavClick}
                />
              ))}
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
                    <>
                      <SidebarNavItem
                        to="/admin/services-engine"
                        label="Services Engine"
                        icon={<Sliders size={18} />}
                        open={open}
                        onNavigate={handleNavClick}
                      />
                      <SidebarNavItem
                        to="/admin/notifications"
                        label="Notification Center"
                        icon={<Bell size={18} />}
                        open={open}
                        onNavigate={handleNavClick}
                      />
                      <SidebarNavItem
                        to="/admin/articles"
                        label="Guides & Updates"
                        icon={<BookOpenText size={18} />}
                        open={open}
                        onNavigate={handleNavClick}
                      />
                    </>
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