import { useEffect, useState } from "react";
import { BadgeDollarSign, Loader2 } from "lucide-react";
import api from "../../lib/axios";

export default function AgentCommissionSettings({ onSettingsLoaded }) {
  const [commissionType, setCommissionType] = useState("FLAT");
  const [commissionValue, setCommissionValue] = useState("2000");
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await api.get("/api/admin/settings/commission");
        setCommissionType(data?.settings?.commissionType || "FLAT");
        setCommissionValue(String(data?.settings?.commissionValue ?? 2000));
        onSettingsLoaded?.({
          commissionType: data?.settings?.commissionType || "FLAT",
          commissionValue: Number(data?.settings?.commissionValue ?? 2000),
        });
        setSettingsLoaded(true);
      } catch (requestError) {
        console.error("LOAD COMMISSION SETTINGS ERROR:", requestError);
        setError(requestError.response?.data?.message || "Unable to load commission settings.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (event) => {
    event.preventDefault();
    const value = Number(commissionValue);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a commission value greater than zero.");
      setMessage("");
      return;
    }
    if (commissionType === "PERCENTAGE" && value > 100) {
      setError("Percentage commission cannot exceed 100%.");
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.put("/api/admin/settings/commission", {
        commissionType,
        commissionValue: value,
      });
      setCommissionValue(String(data?.settings?.commissionValue ?? value));
      setMessage(data?.message || "Commission settings saved.");
    } catch (requestError) {
      console.error("SAVE COMMISSION SETTINGS ERROR:", requestError);
      setError(requestError.response?.data?.message || "Unable to save commission settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-8 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <BadgeDollarSign size={20} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Default Commission (Fallback)</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Used only for services without their own commission rule. Set service-specific commissions in each service below.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading commission settings...
        </div>
      ) : settingsLoaded ? (
        <form onSubmit={saveSettings} className="grid gap-5 md:grid-cols-[1fr,240px,auto] md:items-end">
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Commission type</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="radio"
                name="commissionType"
                value="FLAT"
                checked={commissionType === "FLAT"}
                onChange={() => setCommissionType("FLAT")}
              />
              Flat Rate (₦)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="radio"
                name="commissionType"
                value="PERCENTAGE"
                checked={commissionType === "PERCENTAGE"}
                onChange={() => setCommissionType("PERCENTAGE")}
              />
              Percentage (%)
            </label>
          </fieldset>

          <div>
            <label htmlFor="commission-value" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {commissionType === "FLAT" ? "Amount per request (₦)" : "Service fee percentage (%)"}
            </label>
            <input
              id="commission-value"
              type="number"
              min="0.01"
              max={commissionType === "PERCENTAGE" ? "100" : undefined}
              step="0.01"
              required
              value={commissionValue}
              onChange={(event) => setCommissionValue(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Saving..." : "Save commission"}
          </button>
        </form>
      ) : null}

      {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm font-medium text-emerald-700">{message}</p>}
    </section>
  );
}
