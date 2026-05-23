import { useState } from "react";
import api from "../../lib/axios"; // Ensure this matches your axios instance path
import { Mail, Loader2, ArrowRight } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return alert("Please enter your email address.");

    setLoading(true);

    try {
      // Using your configured axios instance
      await api.post("/api/forgot-password", { email });
      setSent(true);
    } catch (err) {
      console.error("🔥 FORGOT PASSWORD ERROR:", err);
      alert(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-4">
      <div className="bg-white dark:bg-[#161616] p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/10">
        
        {sent ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-3 dark:text-white">Check Your Inbox</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              If an account exists for <span className="font-semibold text-blue-600">{email}</span>, a reset link has been sent. Please check your spam folder if you don't see it.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-3xl font-bold mb-3 dark:text-white">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div className="mb-6">
              <input
                type="email"
                required
                placeholder="name@company.com"
                className="w-full border dark:border-gray-700 bg-transparent p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Send Reset Link <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}