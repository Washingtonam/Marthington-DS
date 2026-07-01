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
  Building2, 
  Sliders,   
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";

const API_BASE = "https://xcombinator.onrender.com";

export default function Sidebar() {
  const location = useLocation();
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

  // 🔥 Track state globally to notify Layout.jsx instantly
  const toggleSidebar = () => {
    const nextState = !open;
    setOpen(nextState);
    window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: nextState }));
  };

  useEffect(() => {
    const handleResize = () => {
      const isLarge = window.innerWidth >= 1024;
      setOpen(isLarge);
      window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: isLarge }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

useEffect(() => {
    if (!isAdmin) return;

    const apiData = async () => {
      try {
        // 1. Core Payments Sync with fallback to /api/finance/payments
        let paymentsData = [];
        try {
          const payRes = await axios.get(`${API_BASE}/api/admin/payments`, { headers });
          paymentsData = payRes.data?.data || payRes.data || [];
        } catch (err) {
          // If admin payments not available, try finance payments endpoint
          try {
            const alt = await axios.get(`${API_BASE}/api/finance/payments`, { headers });
            paymentsData = alt.data?.data || alt.data || [];
          } catch (err2) {
            console.error("Payments fetch fallback failed:", err.message, err2?.message);
            paymentsData = [];
          }
        }

        if (Array.isArray(paymentsData)) {
          setPendingPayments(paymentsData.filter((p) => p && p.status === "pending").length);
        } else {
          setPendingPayments(0);
        }

        // 2. Core Service Requests Sync (left as placeholder)
        setPendingRequests(0);

      } catch (err) {
        console.error("Sidebar counts sync error:", err.message);
        setPendingPayments(0);
        setPendingRequests(0);
      }
    };

     apiData();
  }, [isAdmin]);

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `group relative flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${
      isActive(path)
        ? "bg-white text-blue-900 shadow-2xl scale-[1.02]"
        : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  const NavItem = ({ to, icon, label, badge }) => (
    <Link to={to} onClick={() => window.innerWidth < 1024 && toggleSidebar()} className={linkClass(to)}>
      <div className="flex items-center gap-3">
        <div className={`transition ${isActive(to) ? "scale-110" : "group-hover:scale-105"}`}>
          {icon}
        </div>
        <span className={`font-medium text-sm transition-all duration-200 whitespace-nowrap ${open ? "opacity-100 max-w-xs" : "opacity-0 max-w-0 overflow-hidden"}`}>
          {label}
        </span>
      </div>

      <div className={`flex items-center gap-2 ${!open && "hidden"}`}>
        {badge > 0 && (
          <span className="bg-red-500 text-white text-[11px] px-2 py-1 rounded-full min-w-[22px] text-center shadow-lg font-bold">
            {badge}
          </span>
        )}
        <ChevronRight
          size={15}
          className={`transition ${isActive(to) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        />
      </div>
    </Link>
  );

  return (
    <>
      {/* TRIGGER TRIGGER BUTTON BUTTON */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-3 rounded-2xl shadow-2xl hover:scale-105 transition"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* FIXED SIDEBAR BACKGROUND BODY PANEL */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 transition-all duration-300 overflow-hidden ${
          open ? "translate-x-0 w-[310px]" : "-translate-x-full lg:translate-x-0 lg:w-[85px]"
        }`}
      >
        <div className="h-full overflow-y-auto bg-gradient-to-b from-[#020617] via-[#0F172A] to-[#172554] text-white flex flex-col justify-between border-r border-white/10 shadow-2xl scrollbar-none">
          
          <div className="p-6 pt-20">
            
            <div className="flex items-center justify-between mb-8 overflow-hidden h-10">
              <div className="transition-all duration-300">
                {open ? (
                  <img src="/logofull.png" alt="Marthington" className="h-10 object-contain animate-fadeIn" />
                ) : (
                  <Sparkles size={28} className="text-blue-400 ml-1.5" />
                )}
              </div>
            </div>

            <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl mb-8 transition-all duration-300 ${open ? "p-4" : "p-2 text-center"}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 blur-3xl rounded-full" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shrink-0">
                    <User size={20} />
                  </div>
                  <div className={`flex-1 min-w-0 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 hidden"}`}>
                    <p className="font-semibold truncate text-base">{user?.firstName || "User"}</p>
                    <p className="text-xs text-white/60 truncate">{user?.email}</p>
                  </div>
                </div>

                <div className={`mt-4 flex items-center justify-between transition-all ${!open && "hidden"}`}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Access</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {isSuperAdmin && <Crown size={12} className="text-yellow-400" />}
                      <span className="capitalize text-xs font-medium">{user?.role?.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div className="bg-green-500/20 border border-green-400/20 px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1.5 font-semibold">
                    <Activity size={10} className="text-green-400 animate-pulse" />
                    Live
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 px-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <p className={`text-[10px] uppercase tracking-[0.2em] text-white/40 whitespace-nowrap ${!open && "hidden"}`}>
                  Navigation
                </p>
              </div>

              <div className="space-y-1.5">
                <NavItem to="/dashboard" label="Dashboard" icon={<LayoutDashboard size={18} />} />
                <NavItem to="/verify-nin" label="Verify NIN" icon={<ShieldCheck size={18} />} />
                <NavItem to="/nin-services" label="NIMC Services" icon={<Briefcase size={18} />} />
                <NavItem to="/cac-services" label="CAC Services" icon={<Building2 size={18} />} />
                <NavItem to="/wallet" label="Wallet" icon={<Wallet size={18} />} />
                <NavItem to="/transactions" label="Transactions" icon={<ScrollText size={18} />} />
                <NavItem to="/my-requests" label="Service Requests" icon={<FileText size={18} />} />
                <NavItem to="/my-verification-requests" label="Verification Requests" icon={<ShieldCheck size={18} />} />
              </div>
            </div>

            {isAdmin && (
              <div className="mt-8">
                <div className="flex items-center gap-2 px-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  <p className={`text-[10px] uppercase tracking-[0.2em] text-white/40 whitespace-nowrap ${!open && "hidden"}`}>
                    Admin
                  </p>
                </div>

                <div className="space-y-1.5">
                  <NavItem to="/admin" label="Admin Dashboard" icon={<Settings size={18} />} />
                    {isSuperAdmin && <NavItem to="/admin/users" label="Manage Users" icon={<Users size={18} />} />}
                    <NavItem to="/admin/payments" label="Payment Requests" icon={<CreditCard size={18} />} badge={pendingPayments} />
                    <NavItem to="/admin/requests" label="Service Requests" icon={<Bell size={18} />} badge={pendingRequests} />
                    <NavItem to="/admin/verification-requests" label="Verification Requests" icon={<ShieldCheck size={18} />} />
                    {isSuperAdmin && (
                      <NavItem to="/admin/pricing" label="Pricing Engine" icon={<Sliders size={18} />} />
                    )}
                </div>
              </div>
            )}

          </div>

          <div className="p-6 border-t border-white/10">
            <button
              onClick={toggleTheme}
              className="w-full mb-3 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition flex items-center justify-center gap-2 font-semibold text-xs"
            >
              {theme === "dark" ? (
                <>
                  <SunMedium size={16} className="text-yellow-400" />
                  <span className={!open ? "hidden" : ""}>Light</span>
                </>
              ) : (
                <>
                  <MoonStar size={16} className="text-indigo-400" />
                  <span className={!open ? "hidden" : ""}>Dark</span>
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:opacity-95 py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md"
            >
              <LogOut size={16} />
              <span className={!open ? "hidden" : ""}>Logout</span>
            </button>
          </div>

        </div>
      </aside>
    </>
  );
}