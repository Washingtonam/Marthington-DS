import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";

export default function VerifyBVN() {
  const [bvn, setBvn] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [price, setPrice] = useState(0);

  const { user, balance, setBalance } = useUser();

  // =========================
  // FETCH PRICING
  // =========================
  const fetchPricing = async () => {
    try {
      const res = await fetch("https://xcombinator.onrender.com/api/pricing");
      const data = await res.json();
      setPrice(data.bvn.price);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  // =========================
  // VERIFY BVN
  // =========================
  const handleVerify = async () => {
    if (bvn.length !== 11) {
      return alert("BVN must be 11 digits");
    }

    if (balance < price) {
      return alert(`Insufficient balance. Required ₦${price}`);
    }

    setLoading(true);

    try {
      const res = await fetch("https://xcombinator.onrender.com/api/verify-bvn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bvn,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      setResult(data);
      setBalance(data.balance);

    } catch (error) {
      console.error(error);
      alert("Network error");
    }

    setLoading(false);
  };

  const info =
    result?.data?.data ||
    result?.data ||
    null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Verify BVN</h1>

      <p className="mb-2 font-medium">Balance: ₦{balance}</p>
      <p className="mb-4 text-sm text-gray-600">Price: ₦{price}</p>

      <div className="bg-white p-6 rounded shadow max-w-md">
        <input
          type="text"
          placeholder="Enter BVN (11 digits)"
          value={bvn}
          onChange={(e) => setBvn(e.target.value)}
          className="w-full border p-3 mb-4 rounded"
        />

        <button
          onClick={handleVerify}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Verifying..." : `Verify BVN (₦${price})`}
        </button>
      </div>

      {info && (
        <div className="mt-6 bg-white p-6 rounded-xl shadow max-w-md border">
          <h2 className="font-semibold text-lg mb-4">BVN Result</h2>

          <p><b>First Name:</b> {info.firstname || "N/A"}</p>
          <p><b>Middle Name:</b> {info.middlename || "N/A"}</p>
          <p><b>Last Name:</b> {info.lastname || "N/A"}</p>

          <p><b>Phone:</b> {info.phone || "N/A"}</p>
          <p><b>DOB:</b> {info.dob || "N/A"}</p>
          <p><b>BVN:</b> {info.bvn || "N/A"}</p>
        </div>
      )}
    </div>
  );
}