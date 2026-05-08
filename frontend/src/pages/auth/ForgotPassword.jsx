import { useState } from "react";

const API = "https://xcombinator.onrender.com";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) return alert("Enter your email");

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // ✅ DO NOT REDIRECT
      setSent(true);

    } catch (err) {
      alert(err.message || "Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 px-4">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

        {/* SUCCESS STATE */}
        {sent ? (
          <div className="text-center">

            <div className="text-4xl mb-3">📩</div>

            <h2 className="text-xl font-bold mb-2">
              Check Your Email
            </h2>

            <p className="text-gray-500 text-sm">
              If an account exists, a reset link has been sent.
              <br />
              Please check your inbox (and spam).
            </p>

          </div>
        ) : (
          <>
            {/* HEADER */}
            <h2 className="text-2xl font-bold mb-2">
              Forgot Password
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we’ll send you a reset link
            </p>

            {/* INPUT */}
            <input
              type="email"
              placeholder="Email address"
              className="w-full border p-3 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* BUTTON */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        )}

      </div>
    </div>
  );
}