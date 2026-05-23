import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();

    if (password.length < 6) return alert("Password must be at least 6 characters.");
    if (password !== confirmPassword) return alert("Passwords do not match.");

    setLoading(true);
    try {
      await api.post(`/api/reset-password/${token}`, { newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      console.error("🔥 RESET ERROR:", err);
      alert(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-4">
      <div className="bg-white dark:bg-[#161616] p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/10">
        
        {success ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2 dark:text-white">Password Updated</h2>
            <p className="text-gray-500 dark:text-gray-400">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <h2 className="text-3xl font-bold mb-3 dark:text-white">New Password</h2>
            <p className="text-sm text-gray-500 mb-8">
              Please enter your new secure password below.
            </p>

            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-gray-400" size={18} />
                <input
                  type="password"
                  placeholder="New Password"
                  className="w-full border dark:border-gray-700 bg-transparent p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4 text-gray-400" size={18} />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  className="w-full border dark:border-gray-700 bg-transparent p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}