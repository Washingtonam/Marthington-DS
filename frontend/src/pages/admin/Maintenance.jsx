import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "https://xcombinator.onrender.com";

export default function Maintenance() {
  const [status, setStatus] = useState(false);
  const [message, setMessage] = useState("");

  const headers = {
    email: localStorage.getItem("email"),
  };

  // =========================
  // FETCH STATUS
  // =========================
  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/maintenance`, { headers });
      setStatus(res.data.active);
      setMessage(res.data.message || "");
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // UPDATE STATUS
  // =========================
  const updateStatus = async () => {
    try {
      await axios.post(
        `${API_BASE}/api/admin/maintenance`,
        {
          active: status,
          message,
        },
        { headers }
      );

      alert("Maintenance updated");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="p-6">

      <h1 className="text-xl font-bold mb-6">System Maintenance</h1>

      <div className="bg-white p-6 rounded shadow max-w-md">

        {/* TOGGLE */}
        <div className="flex items-center justify-between mb-4">
          <span>Enable Maintenance Mode</span>

          <input
            type="checkbox"
            checked={status}
            onChange={() => setStatus(!status)}
          />
        </div>

        {/* MESSAGE */}
        <textarea
          placeholder="Maintenance message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />

        <button
          onClick={updateStatus}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Save Changes
        </button>

      </div>

    </div>
  );
}