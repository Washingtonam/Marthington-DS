import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

// Public Pages
import Home from "./pages/public/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Dashboard & User
import Dashboard from "./pages/dashboard/Dashboard";
import Profile from "./pages/profile/Profile";
import UserRequests from "./pages/UserRequests";
import Wallet from "./pages/wallet/Wallet";
import Transactions from "./pages/transactions/Transactions";

// Services
import VerifyNIN from "./pages/verification/VerifyNIN";
import VerifyBVN from "./pages/verification/VerifyBVN";
import VerifyResult from "./pages/verification/VerifyResult";
import NINServices from "./pages/services/NINServices";
import Validation from "./pages/services/Validation";
import IPEClearance from "./pages/services/IPEClearance";
import Modification from "./pages/services/Modification";
import SelfServiceForm from "./pages/services/SelfServiceForm";
import CacServices from "./pages/services/CacServices";
import Personalization from "./pages/services/Personalization";

// Admin
import Admin from "./pages/admin/Admin";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminRequests from "./pages/admin/AdminRequests";

// Layout & Context
import Layout from "./layout/Layout";
import { ThemeProvider } from "./context/ThemeContext";

// ==============================
// AUTH HELPERS
// ==============================
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

const isAuthenticated = () => !!localStorage.getItem("user");
const isAdmin = () => {
  const user = getUser();
  return user?.role === "admin" || user?.role === "super_admin";
};
const isSuperAdmin = () => getUser()?.role === "super_admin";

// ==============================
// PROTECTED ROUTES MIDDLEWARES
// ==============================
const ProtectedRoute = ({ children }) => (!isAuthenticated() ? <Navigate to="/login" /> : children);

const AdminRoute = ({ children }) => {
  if (!isAuthenticated()) return <Navigate to="/login" />;
  if (!isAdmin()) return <Navigate to="/dashboard" />;
  return children;
};

const SuperAdminRoute = ({ children }) => {
  if (!isAuthenticated()) return <Navigate to="/login" />;
  if (!isSuperAdmin()) return <Navigate to="/dashboard" />;
  return children;
};

// ==============================
// INTERNAL PLATFORM WORKSPACE
// ==============================
function DashboardRoutes() {
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          
          {/* Verification */}
          <Route path="/verify-nin" element={<VerifyNIN />} />
          <Route path="/verify-bvn" element={<VerifyBVN />} />
          <Route path="/verify-result" element={<VerifyResult />} />

          {/* User History */}
          <Route path="/my-requests" element={<UserRequests />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/transactions" element={<Transactions />} />

          {/* Services */}
          <Route path="/nin-services" element={<NINServices />} />
          <Route path="/nin-services/validation" element={<Validation />} />
          <Route path="/nin-services/ipe-clearance" element={<IPEClearance />} />
          <Route path="/nin-services/modification" element={<Modification />} />
          <Route path="/nin-services/personalization" element={<Personalization />} />
          <Route path="/nin-services/selfservice" element={<SelfServiceForm />} />
          <Route path="/cac-services" element={<CacServices />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/admin/requests" element={<AdminRoute><AdminRequests /></AdminRoute>} />
          <Route path="/admin/pricing" element={<SuperAdminRoute><AdminPricing /></SuperAdminRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
}

// ==============================
// APP ROUTER CONTROLLER
// ==============================
function AppRoutes() {
  const location = useLocation();
  const loggedIn = isAuthenticated();

  if (location.pathname === "/") return loggedIn ? <Navigate to="/dashboard" /> : <Home />;
  if (location.pathname === "/login") return loggedIn ? <Navigate to="/dashboard" /> : <Login />;
  if (location.pathname === "/register") return loggedIn ? <Navigate to="/dashboard" /> : <Register />;
  if (location.pathname === "/forgot-password") return <ForgotPassword />;
  if (location.pathname === "/reset-password") return <ResetPassword />;

  return <DashboardRoutes />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}