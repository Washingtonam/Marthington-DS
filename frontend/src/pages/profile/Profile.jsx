import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import { 
  UserCircle2, Mail, ShieldCheck, Wallet, LockKeyhole, 
  Eye, EyeOff, CreditCard, FileText, ArrowRight, BadgeCheck, Loader2 
} from "lucide-react";
import { formatNaira } from "../../lib/currency";
import { motion } from "framer-motion";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useUser();
  
  const [passwords, setPasswords] = useState({ current: "", new: "" });
  const [show, setShow] = useState({ current: false, new: false });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new.length < 6) return alert("Password must be at least 6 characters.");

    setLoading(true);
    try {
      await api.post("/api/change-password", {
        userId: user.id || user._id,
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
      alert("✅ Password updated successfully");
      setPasswords({ current: "", new: "" });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null; // Or a loading spinner

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER CARD */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
              <UserCircle2 size={60} />
            </div>
            <div>
              <h1 className="text-4xl font-black">My Profile</h1>
              <p className="text-white/70 mt-2">Manage your account settings and security</p>
            </div>
          </div>
          <div className="bg-white/10 border border-white/10 backdrop-blur rounded-3xl p-5 min-w-[220px]">
            <p className="text-sm text-white/60 mb-1">Available Wallet Balance</p>
            <h2 className="text-5xl font-black">{formatNaira(user.walletBalance ?? 0)}</h2>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* SIDEBAR: Info & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="font-bold text-lg mb-6 flex items-center gap-2"><ShieldCheck className="text-blue-600" /> Account Info</h2>
            <div className="space-y-4">
              <InfoItem label="Email" value={user.email} icon={<Mail size={18} />} />
              <InfoItem label="Role" value={user.role?.replace("_", " ")} icon={<BadgeCheck size={18} />} />
              <InfoItem label="Wallet Balance" value={formatNaira(user.walletBalance ?? 0)} icon={<Wallet size={18} />} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="font-bold text-lg mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <ActionButton label="Fund Wallet" sub="Fund your wallet" icon={<CreditCard />} onClick={() => navigate("/wallet")} />
              <ActionButton label="Transactions" sub="View payment history" icon={<FileText />} onClick={() => navigate("/transactions")} />
            </div>
          </div>
        </div>

        {/* MAIN: Change Password */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-4"><LockKeyhole size={28} className="text-blue-600" /> Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <PasswordField label="Current Password" value={passwords.current} show={show.current} onToggle={() => setShow({...show, current: !show.current})} onChange={(v) => setPasswords({...passwords, current: v})} />
            <PasswordField label="New Password" value={passwords.new} show={show.new} onToggle={() => setShow({...show, new: !show.new})} onChange={(v) => setPasswords({...passwords, new: v})} />
            
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold transition flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function InfoItem({ label, value, icon }) {
  return (
    <div className="bg-gray-50 dark:bg-[#0B1120] rounded-2xl p-4 flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-sm capitalize">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ label, sub, icon, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between bg-gray-900 text-white p-5 rounded-2xl hover:scale-[1.02] transition">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">{icon}</div>
        <div className="text-left"><p className="font-semibold">{label}</p><p className="text-xs text-white/70">{sub}</p></div>
      </div>
      <ArrowRight size={18} />
    </button>
  );
}

function PasswordField({ label, value, show, onToggle, onChange }) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <div className="flex items-center gap-3 border dark:border-gray-700 bg-gray-50 dark:bg-[#0B1120] rounded-2xl px-4 py-4">
        <LockKeyhole size={18} className="text-gray-400" />
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none w-full text-sm" />
        <button type="button" onClick={onToggle}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
    </div>
  );
}