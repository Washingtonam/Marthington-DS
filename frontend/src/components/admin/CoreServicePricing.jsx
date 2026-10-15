import React from "react";
import { useEffect, useState } from "react";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";
import api from "../../lib/axios";

const pricingSections = [
  {
    title: "Verify NIN",
    description: "Set the per-check price and control whether Verify NIN appears in the user sidebar.",
    fields: [
      { path: "unitPrice", label: "Customer unit price (₦)" },
      { path: "agentPrice", label: "Agent unit price (₦)" },
    ],
  },
];

const initialPricing = {
  unitPrice: "250",
  agentPrice: "150",
  verifyNinEnabled: true,
};

const getValue = (source, path) => path.split(".").reduce((value, key) => value?.[key], source);

const setValue = (source, path, value) => {
  const keys = path.split(".");
  const next = { ...source };
  let target = next;

  keys.slice(0, -1).forEach((key) => {
    target[key] = { ...target[key] };
    target = target[key];
  });
  target[keys[keys.length - 1]] = value;
  return next;
};

export default function CoreServicePricing() {
  const [values, setValues] = useState(initialPricing);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const { data } = await api.get("/api/pricing");
        setValues({
          unitPrice: String(data?.nin?.unitPrice ?? 250),
          agentPrice: String(data?.nin?.agentPrice ?? 150),
          verifyNinEnabled: data?.platformServices?.verifyNin?.enabled !== false,
        });
        setLoaded(true);
      } catch (requestError) {
        console.error("LOAD CORE SERVICE PRICING ERROR:", requestError);
        setError(requestError.response?.data?.message || "Unable to load service prices.");
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, []);

  const savePricing = async (event) => {
    event.preventDefault();
    const fields = pricingSections.flatMap((section) => [
      ...(section.fields || []),
      ...(section.columns || []).flatMap((column) => column.fields),
    ]);
    const invalidField = fields.find(({ path }) => {
      const value = Number(getValue(values, path));
      return !Number.isFinite(value) || value <= 0;
    });

    if (invalidField) {
      setError(`${invalidField.label} must be a valid amount greater than zero.`);
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        unitPrice: Number(values.unitPrice),
        agentPrice: Number(values.agentPrice),
        platformServices: { verifyNin: { enabled: values.verifyNinEnabled } },
      };
      await api.put("/api/admin/pricing", payload);
      setMessage("Service prices saved successfully.");
    } catch (requestError) {
      console.error("SAVE CORE SERVICE PRICING ERROR:", requestError);
      setError(requestError.response?.data?.message || "Unable to save service prices.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = ({ path, label }) => (
    <label key={path} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      <span className="mb-1.5 block">{label}</span>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={getValue(values, path) ?? ""}
        onChange={(event) => setValues((current) => setValue(current, path, event.target.value))}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Platform service pricing</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage the API-powered Verify NIN service. NIMC and CAC catalog services are managed below.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading service prices...
        </div>
      ) : loaded ? (
        <form onSubmit={savePricing}>
          <div className="grid gap-4">
            {pricingSections.map((section) => (
              <fieldset key={section.title} className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <legend className="px-2 text-lg font-semibold text-slate-900 dark:text-white">{section.title}</legend>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
                <label className="mb-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">Show Verify NIN in the user sidebar</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">When hidden, users no longer see the Verify NIN navigation item.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={values.verifyNinEnabled}
                    onChange={(event) => setValues((current) => ({ ...current, verifyNinEnabled: event.target.checked }))}
                    aria-label="Show Verify NIN in the user sidebar"
                    className="h-5 w-5 accent-blue-600"
                  />
                  {values.verifyNinEnabled ? <Eye size={18} className="text-emerald-600" /> : <EyeOff size={18} className="text-slate-400" />}
                </label>
                {section.columns ? (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-3">
                    {section.columns.map((column) => (
                      <div key={column.title}>
                        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{column.title}</h3>
                        <div className="grid gap-3">{column.fields.map(renderField)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">{section.fields.map(renderField)}</div>
                )}
              </fieldset>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite">
              {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
              {message && <p role="status" className="text-sm font-medium text-emerald-700">{message}</p>}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving prices..." : "Save service prices"}
            </button>
          </div>
        </form>
      ) : (
        <p role="alert" className="text-sm font-medium text-red-600">{error}</p>
      )}
    </section>
  );
}
