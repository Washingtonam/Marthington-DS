import { useEffect, useMemo, useState } from "react";
import api from "../../lib/axios";
import { parseImportedFormText } from "../../lib/formTextParser";
import {
  Loader2,
  Plus,
  Settings2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Layers3,
  BadgeDollarSign,
  FileText,
  CheckCircle2,
} from "lucide-react";

const emptyFormField = () => ({
  id: crypto.randomUUID(),
  key: "",
  label: "",
  type: "text",
  required: true,
  placeholder: "",
  options: "",
});

const defaultServiceModel = {
  serviceCode: "",
  category: "NIN",
  name: "",
  status: "active",
  price: 0,
  metadata: {
    description: "",
    formFields: [emptyFormField()],
  },
};

const normalizeServiceCode = (value = "") => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .replace(/-+/g, "-");

export default function AdminPricing() {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const headers = { email: user?.email || "" };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("NIN");
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceForm, setServiceForm] = useState(defaultServiceModel);
  const [isCreating, setIsCreating] = useState(false);
  const [importedFormText, setImportedFormText] = useState("");

  const groupedSummary = useMemo(() => {
    const summary = {};
    categories.forEach(({ label }) => {
      const name = label;
      summary[name] = services.filter((service) => String(service.category || "").toUpperCase() === name).length;
    });
    return summary;
  }, [categories, services]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/api/admin/categories", { headers });
      const nextCategories = Array.isArray(res.data?.categories)
        ? res.data.categories.filter((item) => item.isActive !== false)
        : [];
      setCategories(nextCategories);
      setCategory((current) => nextCategories.some((item) => item.label === current)
        ? current
        : (nextCategories[0]?.label || "NIN"));
    } catch (err) {
      console.error("FETCH CATEGORIES ERROR:", err);
      setCategories([]);
    }
  };

  const fetchServices = async (targetCategory = category) => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/services", { params: { category: targetCategory }, headers });
      const catalog = Array.isArray(res.data?.services) ? res.data.services : [];
      setServices(catalog);
      if (!selectedService && catalog[0]) {
        setSelectedService(catalog[0]);
      }
    } catch (err) {
      console.error("FETCH SERVICES ERROR:", err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchServices(category);
  }, [category]);

  const createCategory = async () => {
    const label = window.prompt("Category name");
    if (!label?.trim()) return;
    try {
      const res = await api.post("/api/admin/categories", { label: label.trim() }, { headers });
      await fetchCategories();
      setCategory(res.data?.category?.label || label.trim());
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to create category.");
    }
  };

  const renameCategory = async (item) => {
    const label = window.prompt("Category name", item.label);
    if (!label?.trim() || label.trim() === item.label) return;
    try {
      const res = await api.put(`/api/admin/categories/${item.slug}`, { label: label.trim() }, { headers });
      await fetchCategories();
      setCategory(res.data?.category?.label || label.trim());
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to rename category.");
    }
  };

  const removeCategory = async (item) => {
    if (!window.confirm(`Remove ${item.label} from the service directory? Existing services will stay hidden.`)) return;
    try {
      await api.delete(`/api/admin/categories/${item.slug}`, { headers });
      await fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to remove category.");
    }
  };

  const openCreateModal = () => {
    setIsCreating(true);
    setSelectedService(null);
    setServiceForm({
      ...defaultServiceModel,
      category,
      metadata: {
        description: "",
        formFields: [emptyFormField()],
      },
    });
  };

  const openEditService = (service) => {
    setIsCreating(false);
    setSelectedService(service);
    setServiceForm({
      serviceCode: service.serviceCode || "",
      category: service.category || category,
      name: service.name || "",
      status: service.status || "active",
      price: service.price || 0,
      metadata: {
        description: service.metadata?.description || "",
        formFields: Array.isArray(service.metadata?.formFields) && service.metadata.formFields.length
          ? service.metadata.formFields.map((field) => ({
              ...field,
              options: Array.isArray(field.options) ? field.options.join(", ") : field.options || "",
              id: field.id || crypto.randomUUID(),
            }))
          : [emptyFormField()],
      },
    });
  };

  const updateField = (field, value) => {
    setServiceForm((prev) => {
      if (field === "name" && isCreating && (!prev.serviceCode || prev.serviceCode === normalizeServiceCode(prev.name))) {
        return { ...prev, name: value, serviceCode: normalizeServiceCode(value) };
      }
      return { ...prev, [field]: value };
    });
  };

  const updateFormField = (index, target, value) => {
    setServiceForm((prev) => {
      const nextFields = [...(prev.metadata?.formFields || [])];
      const updatedField = { ...nextFields[index] };

      if (target === "label" && !updatedField.key) {
        updatedField.key = normalizeServiceCode(value || "field");
      }

      updatedField[target] = value;
      nextFields[index] = updatedField;
      return { ...prev, metadata: { ...prev.metadata, formFields: nextFields } };
    });
  };

  const addField = () => {
    setServiceForm((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        formFields: [...(prev.metadata?.formFields || []), emptyFormField()],
      },
    }));
  };

  const importFormText = () => {
    const parsedFields = parseImportedFormText(importedFormText);

    if (!parsedFields.length) {
      alert("No fields could be extracted from the pasted form text.");
      return;
    }

    setServiceForm((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        formFields: parsedFields.map((field) => ({
          ...field,
          id: field.id || crypto.randomUUID(),
          key: String(field.key || "field").trim() || "field",
          options: Array.isArray(field.options) ? field.options.join(", ") : String(field.options || ""),
        })),
      },
    }));
    setImportedFormText("");
  };

  const removeField = (index) => {
    setServiceForm((prev) => {
      const nextFields = (prev.metadata?.formFields || []).filter((_, idx) => idx !== index);
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          formFields: nextFields.length ? nextFields : [emptyFormField()],
        },
      };
    });
  };

  const normalizeFormFields = (fields) =>
    (fields || []).filter((field) => field && (field.key || field.label)).map((field) => ({
      key: normalizeServiceCode(String(field.key || field.label || "").trim() || "field"),
      label: String(field.label || field.key || "").trim(),
      type: field.type || "text",
      required: Boolean(field.required),
      placeholder: field.placeholder || "",
      options: String(field.options || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));

  const getFormValidationError = (fields) => {
    const normalized = normalizeFormFields(fields);

    if (!normalized.length) {
      return "Add at least one field before saving this service.";
    }

    const emptyLabel = (fields || []).find((field) => field && !(String(field.label || "").trim()));
    if (emptyLabel) {
      return "Every form field must have a label before saving.";
    }

    const duplicateLabels = normalized.filter((field, index, list) => list.findIndex((candidate) => candidate.label.toLowerCase() === field.label.toLowerCase()) !== index);
    if (duplicateLabels.length) {
      return "Field labels must be unique. Please rename duplicated labels before saving.";
    }

    const duplicateKeys = normalized.filter((field, index, list) => list.findIndex((candidate) => candidate.key === field.key) !== index);
    if (duplicateKeys.length) {
      return "Each form field must have a unique key. Please rename the duplicate fields before saving.";
    }

    return "";
  };

  const saveService = async () => {
    try {
      setSaving(true);
      const formFields = normalizeFormFields(serviceForm.metadata?.formFields);
      const validationError = getFormValidationError(serviceForm.metadata?.formFields);

      if (validationError) {
        alert(validationError);
        return;
      }

      const payload = {
        serviceCode: normalizeServiceCode(serviceForm.serviceCode || serviceForm.name),
        category: String(serviceForm.category).trim() || category,
        name: String(serviceForm.name).trim(),
        status: serviceForm.status,
        price: Number(serviceForm.price) || 0,
        metadata: {
          description: serviceForm.metadata?.description || "",
          formFields,
        },
      };

      if (!payload.serviceCode || !payload.name) {
        alert("Service code and service name are required.");
        return;
      }

      const duplicateExists = services.some((service) => {
        if (!service || !service.serviceCode) return false;
        if (selectedService && service.serviceCode === selectedService.serviceCode) return false;
        return String(service.serviceCode).toLowerCase() === payload.serviceCode.toLowerCase();
      });

      if (duplicateExists) {
        alert("A service with this code already exists. Please use a different service code.");
        return;
      }

      if (isCreating) {
        await api.post("/api/admin/services", payload, { headers });
        alert("Service created successfully.");
      } else {
        await api.put(`/api/admin/services/${selectedService.serviceCode}`, payload, { headers });
        alert("Service updated successfully.");
      }

      setIsCreating(false);
      setSelectedService(null);
      await fetchServices(category);
    } catch (err) {
      console.error("SERVICE SAVE ERROR:", err);
      alert(err?.response?.data?.message || "Unable to save service.");
    } finally {
      setSaving(false);
    }
  };

  const toggleServiceStatus = async (service) => {
    try {
      const nextStatus = service.status === "active" ? "paused" : "active";
      await api.patch(`/api/admin/services/${service.serviceCode}/status`, { status: nextStatus }, { headers });
      await fetchServices(category);
    } catch (err) {
      console.error("TOGGLE STATUS ERROR:", err);
      alert(err?.response?.data?.message || "Unable to update service status.");
    }
  };

  const removeService = async (service) => {
    if (!window.confirm(`Disable ${service.name} from the service list?`)) return;
    try {
      await api.patch(`/api/admin/services/${service.serviceCode}/status`, { status: "disabled" }, { headers });
      await fetchServices(category);
    } catch (err) {
      console.error("DISABLE SERVICE ERROR:", err);
      alert(err?.response?.data?.message || "Unable to disable service.");
    }
  };

  const getStatusStyles = (status) => {
    if (status === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "paused") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-slate-200 text-slate-600 border-slate-300";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-500 font-medium">Loading services engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={18} />
              <span className="uppercase tracking-widest text-xs opacity-80">SERVICE CONTROL CENTER</span>
            </div>
            <h1 className="text-4xl font-bold mb-3">Services Engine</h1>
            <p className="text-blue-100 max-w-2xl">
              Manage service catalog, pricing, live availability, and form definitions from one control panel.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-white text-slate-900 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2 shadow-lg hover:scale-[1.02] transition"
          >
            <Plus size={18} />
            Add Service
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Service categories</h2>
        <button onClick={createCategory} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={16} /> Add category
        </button>
      </div>
      <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((item) => (
          <button
            key={item.slug}
            onClick={() => setCategory(item.label)}
            className={`rounded-2xl border p-4 text-left transition ${
              category === item.label
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{item.label}</span>
              <span className="flex items-center gap-2">
                <Pencil size={14} onClick={(event) => { event.stopPropagation(); renameCategory(item); }} />
                <Trash2 size={14} onClick={(event) => { event.stopPropagation(); removeCategory(item); }} />
                <Layers3 size={16} />
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold">{groupedSummary[item.label] || 0}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr,1.5fr]">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold">{category} Services</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{services.length} total</span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {services.length === 0 ? (
              <div className="p-8 text-sm text-gray-500">No services found for this category.</div>
            ) : (
              services.map((service) => (
                <div
                  key={service.serviceCode}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition ${selectedService?.serviceCode === service.serviceCode ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => openEditService(service)} className="text-left flex-1">
                      <div className="font-bold text-lg">{service.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{service.serviceCode}</div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusStyles(service.status)}`}>
                        {service.status === "active" ? <ToggleRight size={12} className="text-emerald-600" /> : <ToggleLeft size={12} className="text-slate-500" />}
                        {service.status}
                      </span>
                      <button onClick={() => toggleServiceStatus(service)} className="text-xs font-medium rounded-full px-2 py-1 border border-slate-200 flex items-center gap-1 hover:bg-slate-100">
                        Toggle
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>₦{Number(service.price || 0).toLocaleString()}</span>
                      {service.status === "active" ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">Public</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hidden</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEditService(service)} className="hover:text-blue-600"><Pencil size={15} /></button>
                      <button onClick={() => removeService(service)} className="hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{isCreating ? "Create Service" : "Edit Service"}</h2>
            {selectedService && !isCreating && (
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{selectedService.serviceCode}</span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Service Name">
              <input value={serviceForm.name} onChange={(e) => updateField("name", e.target.value)} className="w-full border border-gray-200 rounded-xl p-3" />
            </Field>
            <Field label="Service Code">
              <input
                value={serviceForm.serviceCode}
                onChange={(e) => updateField("serviceCode", normalizeServiceCode(e.target.value))}
                className="w-full border border-gray-200 rounded-xl p-3"
              />
              <div className="mt-1 text-[11px] text-slate-500">Auto-generated from the service name when left blank.</div>
            </Field>
            <Field label="Category">
              <select value={serviceForm.category} onChange={(e) => updateField("category", e.target.value)} className="w-full border border-gray-200 rounded-xl p-3">
                {categories.map((item) => <option key={item.slug} value={item.label}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={serviceForm.status} onChange={(e) => updateField("status", e.target.value)} className="w-full border border-gray-200 rounded-xl p-3">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="disabled">Disabled</option>
              </select>
            </Field>
            <Field label="Price (₦)" className="md:col-span-2">
              <div className="relative">
                <BadgeDollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="number" value={serviceForm.price} onChange={(e) => updateField("price", e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 pl-11" />
              </div>
            </Field>

            <Field label="Description" className="md:col-span-2">
              <textarea value={serviceForm.metadata?.description || ""} onChange={(e) => setServiceForm((prev) => ({ ...prev, metadata: { ...prev.metadata, description: e.target.value } }))} className="w-full border border-gray-200 rounded-xl p-3 h-24" />
            </Field>
          </div>

          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Form Fields</h3>
              <button onClick={addField} className="text-sm text-blue-600 font-medium flex items-center gap-2">
                <Plus size={16} /> Add field
              </button>
            </div>

            <div className="mb-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
                <FileText size={16} /> Paste a form and auto-create fields
              </div>
              <textarea
                value={importedFormText}
                onChange={(event) => setImportedFormText(event.target.value)}
                placeholder="Paste a copied service form here. Example: NIN, Last Name/Surname, First Name, Middle Name (Optional), Email, GSM, Have you ever done modification? Yes / No"
                className="min-h-[120px] w-full rounded-xl border border-blue-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-blue-500"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={importFormText}
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Import Fields
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {(serviceForm.metadata?.formFields || []).map((field, index) => (
                <div key={field.id || index} className="border rounded-2xl p-4 bg-slate-50">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Field Label">
                      <input value={field.label || ""} onChange={(e) => updateFormField(index, "label", e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5" />
                    </Field>
                    <Field label="Field Key">
                      <input value={field.key || ""} onChange={(e) => updateFormField(index, "key", e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5" />
                    </Field>
                    <Field label="Type">
                      <select value={field.type || "text"} onChange={(e) => updateFormField(index, "type", e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    </Field>
                    <Field label="Placeholder">
                      <input value={field.placeholder || ""} onChange={(e) => updateFormField(index, "placeholder", e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5" />
                    </Field>
                    <Field label="Options (for select)" className="md:col-span-2">
                      <input value={field.options || ""} onChange={(e) => updateFormField(index, "options", e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5" placeholder="Option 1, Option 2, Option 3" />
                    </Field>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={Boolean(field.required)} onChange={(e) => updateFormField(index, "required", e.target.checked)} />
                      Required
                    </label>
                    <button onClick={() => removeField(index)} className="text-red-600 text-sm flex items-center gap-1"><Trash2 size={14} />Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-bold mb-4">Live Form Preview</h3>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              {normalizeFormFields(serviceForm.metadata?.formFields).length === 0 ? (
                <p className="text-sm text-slate-500">No fields yet. Add a field to preview how the user intake form will render.</p>
              ) : (
                <div className="space-y-3">
                  {normalizeFormFields(serviceForm.metadata?.formFields).map((field, index) => (
                    <div key={`${field.key || field.label || index}`} className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{field.label || field.key || `Field ${index + 1}`}</span>
                        {field.required && <span className="text-[10px] uppercase tracking-wide text-red-500">Required</span>}
                      </div>
                      {field.type === "textarea" ? (
                        <div className="h-20 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400">Long text input</div>
                      ) : field.type === "select" ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400">Select: {field.options || "No options"}</div>
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-4 w-4 rounded border border-slate-300 bg-white" /> Checkbox</div>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400">{field.type === "number" ? "Number input" : field.type === "date" ? "Date input" : "Text input"}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={saveService}
            disabled={saving}
            className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="animate-spin" size={18} /> Saving...</> : <><CheckCircle2 size={18} /> Save Service</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}