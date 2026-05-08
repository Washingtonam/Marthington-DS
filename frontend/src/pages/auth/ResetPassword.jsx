import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = "https://xcombinator.onrender.com";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      return alert("Fill all fields");
    }

    if (password.length < 6) {
      return alert("Password must be at least 6 characters");
    }

    if (password !== confirmPassword) {
      return alert("Passwords do not match");
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/reset-password/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          newPassword: password
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      alert(err.message || "Reset failed");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 px-4">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

        {success ? (
          <div className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold mb-2">
              Password Updated
            </h2>
            <p className="text-gray-500 text-sm">
              Redirecting to login...
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-2">
              Reset Password
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              Enter your new password
            </p>

            <input
              type="password"
              placeholder="New Password"
              className="w-full border p-3 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full border p-3 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
            >
              {loading ? "Processing..." : "Reset Password"}
            </button>
          </>
        )}

      </div>
    </div>
  );
}