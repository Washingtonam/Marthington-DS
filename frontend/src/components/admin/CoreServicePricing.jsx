import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import api from "../../lib/axios";

const pricingSections = [
  {
    title: "Verify NIN",
    description: "Set the per-check price for NIN verification.",
    fields: [
      { path: "unitPrice", label: "Customer unit price (₦)" },
      { path: "agentPrice", label: "Agent unit price (₦)" },
    ],
  },
  {
    title: "Verify BVN",
    description: "Set the price charged for each BVN verification.",
    fields: [{ path: "bvn.unitPrice", label: "Verification price (₦)" }],
  },
  {
    title: "NIN Services",
    description: "Manage validation, processing, modification, and self-service prices.",
    columns: [
      {
        title: "Validation",
        fields: [
          { path: "validation.noRecord", label: "No Record (₦)" },
          { path: "validation.updateRecord", label: "Update Record (₦)" },
          { path: "validation.validateModification", label: "Validate Modification (₦)" },
          { path: "validation.vnin", label: "V-NIN Validation (₦)" },
          { path: "validation.photoError", label: "Photograph Error (₦)" },
          { path: "validation.bypass", label: "Bypass NIN (₦)" },
          { path: "validation.tracking", label: "Tracking Search (₦)" },
        ],
      },
      {
        title: "Processing and modification",
        fields: [
          { path: "ipe.inProcessingError", label: "In Processing Error (₦)" },
          { path: "ipe.stillProcessing", label: "Still Processing (₦)" },
          { path: "ipe.newEnrollment", label: "New Enrollment (₦)" },
          { path: "ipe.invalidTracking", label: "Invalid Tracking ID (₦)" },
          { path: "modification.name", label: "Name Modification (₦)" },
          { path: "modification.phone", label: "Phone Modification (₦)" },
          { path: "modification.address", label: "Address Modification (₦)" },
          { path: "modification.dob", label: "Date of Birth Modification (₦)" },
        ],
      },
      {
        title: "Self-service",
        fields: [
          { path: "selfService.emailRetrieval", label: "Email Retrieval (₦)" },
          { path: "selfService.deviceUnlink", label: "Device Unlink (₦)" },
          { path: "slipPrice", label: "Slip Price (₦)" },
        ],
      },
    ],
  },
  {
    title: "CAC Services",
    description: "Set the prices used for CAC registration requests.",
    fields: [
      { path: "cacServices.soleProprietorship", label: "Sole Proprietorship (₦)" },
      { path: "cacServices.partnership", label: "Partnership (₦)" },
      { path: "cacServices.limited1M", label: "Limited Company (₦)" },
    ],
  },
];

const initialPricing = {
  unitPrice: "250",
  agentPrice: "150",
  bvn: { unitPrice: "200" },
  validation: {},
  ipe: {},
  modification: {},
  selfService: {},
  slipPrice: "150",
  cacServices: {},
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

const numberRecord = (values) => Object.fromEntries(
  Object.entries(values).map(([key, value]) => [key, Number(value)])
);

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
          bvn: { unitPrice: String(data?.bvn?.unitPrice ?? 200) },
          validation: Object.fromEntries(
            Object.entries(data?.ninServices?.validation || {}).map(([key, value]) => [key, String(value)])
          ),
          ipe: Object.fromEntries(
            Object.entries(data?.ninServices?.ipe || {}).map(([key, value]) => [key, String(value)])
          ),
          modification: Object.fromEntries(
            Object.entries(data?.ninServices?.modification || {}).map(([key, value]) => [key, String(value)])
          ),
          selfService: Object.fromEntries(
            Object.entries(data?.ninServices?.selfService || {}).map(([key, value]) => [key, String(value)])
          ),
          slipPrice: String(data?.ninServices?.slipPrice ?? 150),
          cacServices: Object.fromEntries(
            Object.entries(data?.cacServices || {}).map(([key, value]) => [key, String(value)])
          ),
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
      return !Number.isFinite(value) || value < 0 || (["unitPrice", "agentPrice", "bvn.unitPrice"].includes(path) && value <= 0);
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
        bvn: { unitPrice: Number(values.bvn.unitPrice) },
        validation: numberRecord(values.validation),
        ipe: numberRecord(values.ipe),
        modification: numberRecord(values.modification),
        selfService: numberRecord(values.selfService),
        slipPrice: Number(values.slipPrice),
        cacServices: numberRecord(values.cacServices),
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
        min={["unitPrice", "agentPrice", "bvn.unitPrice"].includes(path) ? "0.01" : "0"}
        step="0.01"
        value={getValue(values, path) ?? ""}
        onChange={(event) => setValues((current) => setValue(current, path, event.target.value))}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Platform service pricing</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure Verify NIN, Verify BVN, NIN Services, and CAC Services prices. NIMC catalog service prices can be edited in the service catalog below.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading service prices...
        </div>
      ) : loaded ? (
        <form onSubmit={savePricing}>
          <div className="grid gap-4 xl:grid-cols-2">
            {pricingSections.map((section) => (
              <fieldset key={section.title} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <legend className="px-2 text-lg font-semibold text-slate-900 dark:text-white">{section.title}</legend>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
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
