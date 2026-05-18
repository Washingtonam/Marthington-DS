import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Home from "./pages/public/Home";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import Dashboard from "./pages/dashboard/Dashboard";

import VerifyNIN from "./pages/verification/VerifyNIN";
import VerifyBVN from "./pages/verification/VerifyBVN";
import VerifyResult from "./pages/verification/VerifyResult";

import UserRequests from "./pages/UserRequests";

import NINServices from "./pages/services/NINServices";
import Validation from "./pages/services/Validation";
import IPEClearance from "./pages/services/IPEClearance";
import Modification from "./pages/services/Modification";
// 🔥 IMPORT NEW COMPONENT CAPABILITY
import CacServices from "./pages/services/CacServices";
import Personalization from "./pages/services/Personalization";
// Inside your Router tree array assignment block:
<Route path="/nin-services/personalization" element={<Personalization />} />
import Transactions from "./pages/transactions/Transactions";
import Wallet from "./pages/wallet/Wallet";

import Profile from "./pages/profile/Profile";

import Admin from "./pages/admin/Admin";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminRequests from "./pages/admin/AdminRequests";

import Layout from "./layout/Layout";

import { ThemeProvider } from "./context/ThemeContext";

// ==============================
// AUTH HELPERS
// ==============================
function getUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user")
    );
  } catch {
    return null;
  }
}

function isAuthenticated() {
  return !!localStorage.getItem("user");
}

function isAdmin() {
  const user = getUser();
  return (
    user?.role === "admin" ||
    user?.role === "super_admin"
  );
}

function isSuperAdmin() {
  const user = getUser();
  return user?.role === "super_admin";
}

// ==============================
// PROTECTED ROUTES MIDDLEWARES
// ==============================
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  return children;
}

function AdminRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }
  return children;
}

function SuperAdminRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  if (!isSuperAdmin()) {
    return <Navigate to="/dashboard" />;
  }
  return children;
}

// ==============================
// INTERNAL PLATFORM WORKSPACE ROUTES
// ==============================
function DashboardRoutes() {
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          {/* ================= DASHBOARD ================= */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* ================= PROFILE ================= */}
          <Route path="/profile" element={<Profile />} />

          {/* ================= VERIFICATION ================= */}
          <Route path="/verify-nin" element={<VerifyNIN />} />
          <Route path="/verify-bvn" element={<VerifyBVN />} />
          <Route path="/verify-result" element={<VerifyResult />} />

          {/* ================= REQUESTS ================= */}
          <Route path="/my-requests" element={<UserRequests />} />

          {/* ================= SERVICES ================= */}
          <Route path="/nin-services" element={<NINServices />} />
          <Route path="/nin-services/validation" element={<Validation />} />
          <Route path="/nin-services/ipe-clearance" element={<IPEClearance />} />
          <Route path="/nin-services/modification" element={<Modification />} />
          
          {/* 🔥 INJECT NEW DYNAMIC REGISTRATION SYSTEM LINK TAB */}
          <Route path="/cac-services" element={<CacServices />} />

          {/* ================= WALLET ================= */}
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/transactions" element={<Transactions />} />

          {/* ================= ADMIN SYSTEMS ================= */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/admin/requests" element={<AdminRoute><AdminRequests /></AdminRoute>} />
          <Route path="/admin/pricing" element={<SuperAdminRoute><AdminPricing /></SuperAdminRoute>} />

          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
}

// ==============================
// OUTER ROUTE CONTROLLER
// ==============================
function AppRoutes() {
  const location = useLocation();
  const loggedIn = isAuthenticated();

  // ================= HOME =================
  if (location.pathname === "/") {
    return loggedIn ? <Navigate to="/dashboard" /> : <Home />;
  }

  // ================= LOGIN =================
  if (location.pathname === "/login") {
    return loggedIn ? <Navigate to="/dashboard" /> : <Login />;
  }

  // ================= REGISTER =================
  if (location.pathname === "/register") {
    return loggedIn ? <Navigate to="/dashboard" /> : <Register />;
  }

  // ================= PASSWORD =================
  if (location.pathname === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (location.pathname === "/reset-password") {
    return <ResetPassword />;
  }

  // ================= DASHBOARD ROUTER BASE =================
  return <DashboardRoutes />;
}

// ==============================
// MAIN APP ROOT ENTRY POINT
// ==============================
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}