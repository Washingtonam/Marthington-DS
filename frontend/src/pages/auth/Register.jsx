import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios"; // Adjust to your actual axios path
import { Eye, EyeOff, User, Mail, LockKeyhole, ShieldCheck, ArrowRight, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nin: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validation
    if (Object.values(form).some(value => !value)) return alert("Please complete all fields.");
    if (form.password !== form.confirmPassword) return alert("Passwords do not match.");
    if (form.nin.length < 11) return alert("Enter a valid 11-digit NIN.");

    setLoading(true);
    try {
      await api.post("/api/register", form);
      alert("Registration successful! Please log in.");
      navigate("/login");
    } catch (error) {
      console.error("🔥 REGISTRATION ERROR:", error);
      alert(error.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] relative flex items-center justify-center px-4 py-10">
      {/* Background elements remain unchanged */}
      <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-blue-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-indigo-500/20 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 backdrop-blur-xl"
      >
        {/* LEFT SIDE: Branding and Value Proposition */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-12">
            {/* Retain your existing branding content here */}
        </div>

        {/* RIGHT SIDE: Form */}
        <div className="bg-white dark:bg-[#0F172A] p-8 md:p-12 flex items-center">
          <form onSubmit={handleRegister} className="w-full max-w-md mx-auto space-y-5">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Create Account 🚀</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="firstName" placeholder="First Name" onChange={handleChange} className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-[#111827] outline-none" required />
              <input type="text" name="lastName" placeholder="Last Name" onChange={handleChange} className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-[#111827] outline-none" required />
            </div>

            <input type="text" name="nin" placeholder="NIN Number" onChange={handleChange} className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-[#111827] outline-none" required />
            <input type="email" name="email" placeholder="Email Address" onChange={handleChange} className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-[#111827] outline-none" required />
            
            <div className="relative">
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" onChange={handleChange} className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-[#111827] outline-none" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-[#111827] outline-none" required />

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold transition-all">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}