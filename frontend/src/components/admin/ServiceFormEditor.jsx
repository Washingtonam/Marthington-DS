import React from "react";
import SlideOver from "../ui/SlideOver";
import { FileText, Plus, Trash2 } from "lucide-react";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export default function ServiceFormEditor({
  isOpen,
  onClose,
  serviceName,
  fields,
  importedFormText,
  onImportedFormTextChange,
  onAddField,
  onImportFormText,
  onUpdateField,
  onRemoveField,
  normalizeFormFields,
}) {
  const normalizedFields = normalizeFormFields(fields);

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${serviceName || "Service"} Form`}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Form Fields</h3>
          <button type="button" onClick={onAddField} className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <Plus size={16} /> Add field
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <FileText size={16} /> Paste a form and auto-create fields
          </div>
          <textarea
            value={importedFormText}
            onChange={(event) => onImportedFormTextChange(event.target.value)}
            placeholder="Paste a copied service form here. Example: NIN, Last Name/Surname, First Name, Middle Name (Optional), Email, GSM, Have you ever done modification? Yes / No"
            className="min-h-[120px] w-full rounded-xl border border-blue-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-blue-500"
          />
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={onImportFormText} className="rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Import Fields
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id || index} className="rounded-2xl border bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Field Label">
                  <input value={field.label || ""} onChange={(event) => onUpdateField(index, "label", event.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5" />
                </Field>
                {field.type !== "title" && field.type !== "subtitle" && (
                  <Field label="Field Key">
                    <input value={field.key || ""} onChange={(event) => onUpdateField(index, "key", event.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5" />
                  </Field>
                )}
                <Field label="Type">
                  <select value={field.type || "text"} onChange={(event) => onUpdateField(index, "type", event.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="title">Title</option>
                    <option value="subtitle">Subtitle</option>
                    <option value="upload">Upload file</option>
                  </select>
                </Field>
                {field.type !== "title" && field.type !== "subtitle" && (
                  <>
                    <Field label="Placeholder">
                      <input value={field.placeholder || ""} onChange={(event) => onUpdateField(index, "placeholder", event.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5" />
                    </Field>
                    {field.type === "select" && (
                      <Field label="Options (for select)" className="md:col-span-2">
                        <input value={field.options || ""} onChange={(event) => onUpdateField(index, "options", event.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5" placeholder="Option 1, Option 2, Option 3" />
                      </Field>
                    )}
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    disabled={field.type === "title" || field.type === "subtitle"}
                    onChange={(event) => onUpdateField(index, "required", event.target.checked)}
                  />
                  Required {field.type === "title" || field.type === "subtitle" ? "(not applicable)" : ""}
                </label>
                <button type="button" onClick={() => onRemoveField(index)} className="flex items-center gap-1 text-sm text-red-600">
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-6">
          <h3 className="mb-4 text-lg font-bold">Live Form Preview</h3>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            {normalizedFields.length === 0 ? (
              <p className="text-sm text-slate-500">No fields yet. Add a field to preview how the user intake form will render.</p>
            ) : (
              <div className="space-y-3">
                {normalizedFields.map((field, index) => (
                  <div key={`${field.key || field.label || index}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    {field.type === "title" ? (
                      <h3 className="text-lg font-bold text-slate-900">{field.label}</h3>
                    ) : field.type === "subtitle" ? (
                      <h4 className="text-sm font-semibold text-slate-600">{field.label}</h4>
                    ) : (
                      <>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">{field.label || field.key || `Field ${index + 1}`}</span>
                          {field.required && <span className="text-[10px] uppercase tracking-wide text-red-500">Required</span>}
                        </div>
                        {field.type === "textarea" ? (
                          <div className="h-20 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400">Long text input</div>
                        ) : field.type === "select" ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400">Select: {field.options.join(", ") || "No options"}</div>
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-4 w-4 rounded border border-slate-300 bg-white" /> Checkbox</div>
                        ) : field.type === "upload" ? (
                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400"><FileText size={14} /> File upload</div>
                        ) : (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400">{field.type === "number" ? "Number input" : field.type === "date" ? "Date input" : "Text input"}</div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-700">
          <button type="button" onClick={onClose} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
            Done editing form
          </button>
        </div>
      </div>
    </SlideOver>
  );
}
