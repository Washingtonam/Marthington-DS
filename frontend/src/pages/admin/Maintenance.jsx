import { useEffect, useState } from "react";
import api from "../../lib/axios"; // Updated to use your project's axios instance
import { AlertTriangle, Save, Loader2 } from "lucide-react";

export default function Maintenance() {
  const [status, setStatus] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const headers = {
    email: localStorage.getItem("email"),
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/maintenance", { headers });
      setStatus(res.data.active);
      setMessage(res.data.message || "");
    } catch (err) {
      console.error("🔥 FETCH MAINTENANCE ERROR:", err);
    }
    setLoading(false);
  };

  const updateStatus = async () => {
    setSaving(true);
    try {
      await api.post("/api/admin/maintenance", {
        active: status,
        message,
      }, { headers });
      alert("Maintenance mode updated successfully!");
    } catch (err) {
      console.error("🔥 UPDATE MAINTENANCE ERROR:", err);
      alert("Failed to update maintenance mode.");
    }
    setSaving(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">System Maintenance</h1>
        <p className="text-gray-500">Toggle site-wide maintenance mode and set user notices.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-10 text-gray-500">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#161616] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
          
          {/* TOGGLE */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-semibold dark:text-white">Enable Maintenance Mode</h3>
              <p className="text-sm text-gray-500">When enabled, users will see the maintenance notice.</p>
            </div>
            <button
              onClick={() => setStatus(!status)}
              className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 ${
                status ? "bg-blue-600 justify-end" : "bg-gray-300 dark:bg-gray-700 justify-start"
              }`}
            >
              <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
            </button>
          </div>

          {/* MESSAGE */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Maintenance Message
            </label>
            <textarea
              placeholder="e.g., We are performing scheduled upgrades..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full border dark:border-gray-700 bg-transparent p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <button
            onClick={updateStatus}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}