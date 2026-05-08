import {
  LayoutDashboard,
  ShieldCheck,
  Wallet,
  ScrollText,
  Users,
  CreditCard,
  Settings,
  Bell,
  User,
  FileText,
  LogOut,
  Menu,
  X,
  Briefcase,
  ChevronRight,
  MoonStar,
  SunMedium,
  Crown,
  Activity,
  Sparkles,
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";

import { useState, useEffect } from "react";

import axios from "axios";
 
import { useTheme } from "../context/ThemeContext";

const API_BASE = "https://xcombinator.onrender.com";

export default function Sidebar() {

  const location = useLocation();

  const { theme, toggleTheme } = useTheme();

  const [open, setOpen] = useState(false);

  const [pendingPayments, setPendingPayments] = useState(0);

  const [pendingRequests, setPendingRequests] = useState(0);

  const user =
    JSON.parse(
      localStorage.getItem("user")
    ) || {};

  const isAdmin =
    user?.role === "admin" ||
    user?.role === "super_admin";

  const isSuperAdmin =
    user?.role === "super_admin";

  const headers = {
    email: localStorage.getItem("email"),
  };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = () => {

    localStorage.clear();

    window.location.href = "/login";
  };

  // =========================
  // FETCH ADMIN COUNTS
  // =========================
  useEffect(() => {

    if (!isAdmin) return;

    const fetchData = async () => {

      try {

        const payRes = await axios.get(
          `${API_BASE}/api/admin/payments`,
          { headers }
        );

        const paymentsData =
          payRes.data?.data ||
          payRes.data ||
          [];

        setPendingPayments(
          paymentsData.filter(
            (p) =>
              p.status === "pending"
          ).length
        );

        const reqRes = await axios.get(
          `${API_BASE}/api/admin/requests`,
          { headers }
        );

        const requestsData =
          reqRes.data?.data ||
          reqRes.data ||
          [];

        setPendingRequests(
          requestsData.filter(
            (r) =>
              r.status === "pending"
          ).length
        );

      } catch (err) {

        console.error(err);
      }
    };

    fetchData();

  }, []);

  // =========================
  // ACTIVE STATE
  // =========================
  const isActive = (path) =>
    location.pathname === path;

  // =========================
  // STYLES
  // =========================
  const linkClass = (path) =>
    `group relative flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${
      isActive(path)
        ? "bg-white text-blue-900 shadow-2xl scale-[1.02]"
        : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  // =========================
  // NAV ITEM
  // =========================
  const NavItem = ({
    to,
    icon,
    label,
    badge,
  }) => (

    <Link
      to={to}
      onClick={() => setOpen(false)}
      className={linkClass(to)}
    >

      <div className="flex items-center gap-3">

        <div
          className={`transition ${
            isActive(to)
              ? "scale-110"
              : "group-hover:scale-105"
          }`}
        >
          {icon}
        </div>

        <span className="font-medium text-sm">
          {label}
        </span>

      </div>

      <div className="flex items-center gap-2">

        {badge > 0 && (

          <span className="bg-red-500 text-white text-[11px] px-2 py-1 rounded-full min-w-[22px] text-center shadow-lg">
            {badge}
          </span>

        )}

        <ChevronRight
          size={15}
          className={`transition ${
            isActive(to)
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
        />

      </div>

    </Link>
  );

  return (
    <>

      {/* MOBILE BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-3 rounded-2xl shadow-2xl"
      >
        <Menu size={20} />
      </button>

      {/* OVERLAY */}
      {open && (

        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />

      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[310px] z-50 transition-transform duration-300 ${
          open
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >

        <div className="h-full overflow-y-auto bg-gradient-to-b from-[#020617] via-[#0F172A] to-[#172554] text-white flex flex-col justify-between border-r border-white/10 shadow-2xl">

          {/* TOP */}
          <div className="p-6">

            {/* LOGO */}
            <div className="flex items-center justify-between mb-8">

              <div>

                <img
                  src="/logofull.png"
                  alt="Xcombinator"
                  className="h-10 object-contain"
                />

                <div className="flex items-center gap-2 mt-3 text-xs text-white/50">

                  <Sparkles size={12} />

                  <span>
                    Identity Infrastructure Platform
                  </span>

                </div>

              </div>

              <button
                onClick={() => setOpen(false)}
                className="lg:hidden text-white/70 hover:text-white"
              >
                <X size={22} />
              </button>

            </div>

            {/* USER CARD */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 mb-8">

              {/* GLOW */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 blur-3xl rounded-full" />

              <div className="relative z-10">

                <div className="flex items-center gap-4">

                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl">

                    <User size={24} />

                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="font-semibold truncate text-lg">
                      {user?.firstName || "User"}
                    </p>

                    <p className="text-xs text-white/60 truncate">
                      {user?.email}
                    </p>

                  </div>

                </div>

                <div className="mt-5 flex items-center justify-between">

                  <div>

                    <p className="text-[10px] uppercase tracking-widest text-white/40">
                      Access Level
                    </p>

                    <div className="mt-1 flex items-center gap-2">

                      {user?.role === "super_admin" && (
                        <Crown
                          size={14}
                          className="text-yellow-400"
                        />
                      )}

                      <span className="capitalize text-sm font-medium">
                        {user?.role?.replace("_", " ")}
                      </span>

                    </div>

                  </div>

                  <div className="bg-green-500/20 border border-green-400/20 px-3 py-2 rounded-2xl text-xs flex items-center gap-2">

                    <Activity
                      size={12}
                      className="text-green-400"
                    />

                    Active

                  </div>

                </div>

              </div>

            </div>

            {/* MAIN MENU */}
            <div>

              <div className="flex items-center gap-2 px-2 mb-3">

                <div className="w-2 h-2 rounded-full bg-blue-500" />

                <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">
                  Main Navigation
                </p>

              </div>

              <div className="space-y-2">

                <NavItem
                  to="/dashboard"
                  label="Dashboard"
                  icon={<LayoutDashboard size={18} />}
                />

                <NavItem
                  to="/verify-nin"
                  label="Verify NIN"
                  icon={<ShieldCheck size={18} />}
                />

                <NavItem
                  to="/nin-services"
                  label="NIN Services"
                  icon={<Briefcase size={18} />}
                />

                <NavItem
                  to="/wallet"
                  label="Wallet"
                  icon={<Wallet size={18} />}
                />

                <NavItem
                  to="/transactions"
                  label="Transactions"
                  icon={<ScrollText size={18} />}
                />

                <NavItem
                  to="/my-requests"
                  label="My Requests"
                  icon={<FileText size={18} />}
                />

              </div>

            </div>

            {/* ADMIN */}
            {isAdmin && (

              <div className="mt-10">

                <div className="flex items-center gap-2 px-2 mb-3">

                  <div className="w-2 h-2 rounded-full bg-yellow-400" />

                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">
                    Admin Controls
                  </p>

                </div>

                <div className="space-y-2">

                  <NavItem
                    to="/admin"
                    label="Admin Dashboard"
                    icon={<Settings size={18} />}
                  />

                  <NavItem
                    to="/admin/users"
                    label="Manage Users"
                    icon={<Users size={18} />}
                  />

                  <NavItem
                    to="/admin/payments"
                    label="Payment Requests"
                    icon={<CreditCard size={18} />}
                    badge={pendingPayments}
                  />

                  <NavItem
                    to="/admin/requests"
                    label="Service Requests"
                    icon={<Bell size={18} />}
                    badge={pendingRequests}
                  />

                  {isSuperAdmin && (

                    <NavItem
                      to="/admin/pricing"
                      label="Pricing Engine"
                      icon={<Settings size={18} />}
                    />

                  )}

                </div>

              </div>

            )}

          </div>

          {/* FOOTER */}
          <div className="p-6 border-t border-white/10">

            {/* THEME */}
            <button
              onClick={toggleTheme}
              className="w-full mb-4 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl transition flex items-center justify-center gap-3"
            >

              {theme === "dark" ? (
                <>
                  <SunMedium size={18} />
                  Light Mode
                </>
              ) : (
                <>
                  <MoonStar size={18} />
                  Dark Mode
                </>
              )}

            </button>

            {/* LOGOUT */}
            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 py-4 rounded-2xl font-medium flex items-center justify-center gap-3 transition shadow-xl"
            >

              <LogOut size={18} />

              Logout

            </button>

            {/* VERSION */}
            <div className="mt-5 text-center">

              <p className="text-xs text-white/30">
                Xcombinator SaaS v1.0
              </p>

            </div>

          </div>

        </div>

      </aside>
    </>
  );
}