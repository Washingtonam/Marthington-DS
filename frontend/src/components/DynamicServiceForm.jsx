import React, { useState } from "react";
import { Loader2, Send, Upload } from "lucide-react";

export default function DynamicServiceForm({ service, onSubmit, onCancel }) {
  const fields = Array.isArray(service?.metadata?.formFields) ? service.metadata.formFields : [];

  const getInitialValues = () => {
    const initialValues = {};
    fields.forEach((field) => {
      if (field.type === "title" || field.type === "subtitle") {
        return;
      } else if (field.type === "checkbox") {
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

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}. Please try again.`));
    reader.readAsDataURL(file);
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const requiredField = fields.find((field) => {
      if (!field.required || field.type === "title" || field.type === "subtitle") return false;
      const value = values[field.key];
      return field.type === "upload" ? !value : !String(value ?? "").trim();
    });
    if (requiredField) {
      alert(`${requiredField.label || requiredField.key} is required.`);
      return;
    }

    setSubmitting(true);
    try {
      const formData = {};
      for (const field of fields) {
        if (field.type === "title" || field.type === "subtitle") continue;
        const value = values[field.key];
        formData[field.key] = field.type === "upload" && value
          ? await readFileAsDataUrl(value)
          : value;
      }

      const payload = {
        service: service?.serviceCode || service?.name || "custom-service",
        type: service?.serviceCode || service?.name || "custom-service",
        nin: String(values.nin || values.NIN || "N/A").trim() || "N/A",
        formData,
      };

      await onSubmit(payload);
    } catch (error) {
      alert(error?.message || "Unable to prepare the selected file.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!fields.length) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          This service does not require additional information. Submit to create your request.
        </div>
        <div className="flex justify-end gap-3">
          {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>}
          <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Submitting..." : "Submit Service"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        {fields.map((field) => {
          const fieldValue = values[field.key] ?? "";

          if (field.type === "title") {
            return <h2 key={field.key || field.label} className="pt-2 text-xl font-bold text-slate-900">{field.label || field.key}</h2>;
          }

          if (field.type === "subtitle") {
            return <h3 key={field.key || field.label} className="pt-1 text-sm font-semibold text-slate-600">{field.label || field.key}</h3>;
          }

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

          if (field.type === "upload") {
            const file = fieldValue;
            return (
              <label key={field.key || field.label} className="block text-sm font-medium text-slate-700">
                <span className="mb-1.5 block">
                  {field.label || field.key}
                  {field.required ? <span className="text-red-500"> *</span> : null}
                </span>
                <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Upload className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    type="file"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] || null;
                      const totalUploadSize = fields.reduce((total, uploadField) => {
                        if (uploadField.type !== "upload") return total;
                        const selectedSize = uploadField.key === field.key
                          ? selectedFile?.size || 0
                          : values[uploadField.key]?.size || 0;
                        return total + selectedSize;
                      }, 0);
                      if (selectedFile && (selectedFile.size > 5 * 1024 * 1024 || totalUploadSize > 6 * 1024 * 1024)) {
                        alert("Each file must be 5 MB or smaller, and all uploaded files together must be 6 MB or smaller.");
                        event.target.value = "";
                        handleChange(field.key, null);
                        return;
                      }
                      handleChange(field.key, selectedFile);
                    }}
                    className="min-w-0 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                  />
                </span>
                {file && <span className="mt-1 block text-xs text-slate-500">{file.name}</span>}
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
