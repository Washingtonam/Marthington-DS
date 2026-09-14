import { useState } from "react";
import { Loader2, Send } from "lucide-react";

export default function DynamicServiceForm({ service, onSubmit, onCancel }) {
  const fields = Array.isArray(service?.metadata?.formFields) ? service.metadata.formFields : [];

  const getInitialValues = () => {
    const initialValues = {};
    fields.forEach((field) => {
      if (field.type === "checkbox") {
        initialValues[field.key] = false;
      } else if (field.type === "select") {
        initialValues[field.key] = field.options?.[0] || "";
      } else {
        initialValues[field.key] = "";
      }
    });
    return initialValues;
  };

  const [values, setValues] = useState(getInitialValues);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const requiredField = fields.find((field) => field.required && !String(values[field.key] ?? "").trim());
    if (requiredField) {
      alert(`${requiredField.label || requiredField.key} is required.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        service: service?.serviceCode || service?.name || "custom-service",
        type: service?.serviceCode || service?.name || "custom-service",
        nin: String(values.nin || values.NIN || "N/A").trim() || "N/A",
        formData: values,
      };

      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  if (!fields.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        This service has no form definition yet. Add form fields in the Services Engine to enable user intake.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        {fields.map((field) => {
          const fieldValue = values[field.key] ?? "";

          if (field.type === "textarea") {
            return (
              <label key={field.key || field.label} className="block text-sm font-medium text-slate-700">
                <span className="mb-1.5 block">
                  {field.label || field.key}
                  {field.required ? <span className="text-red-500"> *</span> : null}
                </span>
                <textarea
                  value={fieldValue}
                  onChange={(event) => handleChange(field.key, event.target.value)}
                  placeholder={field.placeholder || ""}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none ring-0 transition focus:border-blue-500"
                  rows={4}
                />
              </label>
            );
          }

          if (field.type === "select") {
            const options = Array.isArray(field.options) ? field.options : String(field.options || "").split(",").map((option) => option.trim()).filter(Boolean);
            return (
              <label key={field.key || field.label} className="block text-sm font-medium text-slate-700">
                <span className="mb-1.5 block">
                  {field.label || field.key}
                  {field.required ? <span className="text-red-500"> *</span> : null}
                </span>
                <select
                  value={fieldValue}
                  onChange={(event) => handleChange(field.key, event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-blue-500"
                >
                  <option value="">Select an option</option>
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            );
          }

          if (field.type === "checkbox") {
            return (
              <label key={field.key || field.label} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(fieldValue)}
                  onChange={(event) => handleChange(field.key, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  {field.label || field.key}
                  {field.required ? <span className="text-red-500"> *</span> : null}
                </span>
              </label>
            );
          }

          return (
            <label key={field.key || field.label} className="block text-sm font-medium text-slate-700">
              <span className="mb-1.5 block">
                {field.label || field.key}
                {field.required ? <span className="text-red-500"> *</span> : null}
              </span>
              <input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                value={fieldValue}
                onChange={(event) => handleChange(field.key, event.target.value)}
                placeholder={field.placeholder || ""}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-blue-500"
              />
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting..." : "Submit Service"}
        </button>
      </div>
    </form>
  );
}
