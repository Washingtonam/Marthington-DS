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
import Legal from "./pages/Legal";

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
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminRequests from "./pages/admin/AdminRequests";
import UserDetailView from "./pages/admin/UserDetailView";
import Contact from "./pages/Contact";

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
// ==============================
// APP ROUTER CONTROLLER
// ==============================
function AppRoutes() {
  const location = useLocation();
  const loggedIn = isAuthenticated();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={loggedIn ? <Navigate to="/dashboard" /> : <Home />} />
      <Route path="/login" element={loggedIn ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={loggedIn ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Legal Pages (Public) */}
      <Route path="/legal" element={<Legal />} />
      <Route path="/legal/:docType" element={<Legal />} />

      {/* Dashboard & Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      
      {/* Verification Routes */}
      <Route path="/verify-nin" element={<ProtectedRoute><Layout><VerifyNIN /></Layout></ProtectedRoute>} />
      <Route path="/verify-bvn" element={<ProtectedRoute><Layout><VerifyBVN /></Layout></ProtectedRoute>} />
      <Route path="/verify-result" element={<ProtectedRoute><Layout><VerifyResult /></Layout></ProtectedRoute>} />
      <Route path="/verify-result/:requestId" element={<ProtectedRoute><Layout><VerifyResult /></Layout></ProtectedRoute>} />

      {/* User History Routes */}
      <Route path="/my-requests" element={<ProtectedRoute><Layout><UserRequests /></Layout></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Layout><Wallet /></Layout></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>} />
      <Route path="/contact" element={<ProtectedRoute><Layout><Contact /></Layout></ProtectedRoute>} />

      {/* Services Routes */}
      <Route path="/nin-services" element={<ProtectedRoute><Layout><NINServices /></Layout></ProtectedRoute>} />
      <Route path="/nin-services/validation" element={<ProtectedRoute><Layout><Validation /></Layout></ProtectedRoute>} />
      <Route path="/nin-services/ipe-clearance" element={<ProtectedRoute><Layout><IPEClearance /></Layout></ProtectedRoute>} />
      <Route path="/nin-services/modification" element={<ProtectedRoute><Layout><Modification /></Layout></ProtectedRoute>} />
      <Route path="/nin-services/personalization" element={<ProtectedRoute><Layout><Personalization /></Layout></ProtectedRoute>} />
      <Route path="/nin-services/selfservice" element={<ProtectedRoute><Layout><SelfServiceForm /></Layout></ProtectedRoute>} />
      <Route path="/cac-services" element={<ProtectedRoute><Layout><CacServices /></Layout></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<SuperAdminRoute><Layout><AdminDashboard /></Layout></SuperAdminRoute>} />
      <Route path="/admin/users" element={<SuperAdminRoute><Layout><AdminUsers /></Layout></SuperAdminRoute>} />
      <Route path="/admin/payments" element={<AdminRoute><Layout><AdminPayments /></Layout></AdminRoute>} />
      <Route path="/admin/requests" element={<AdminRoute><Layout><AdminRequests /></Layout></AdminRoute>} />
      <Route path="/admin/pricing" element={<SuperAdminRoute><Layout><AdminPricing /></Layout></SuperAdminRoute>} />
      <Route path="/admin/user/:userId/details" element={<SuperAdminRoute><Layout><UserDetailView /></Layout></SuperAdminRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
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