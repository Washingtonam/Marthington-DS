import React, { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, Plus, Search, Users } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";

const emptyFep = { name: "", whatsapp: "", email: "", notes: "" };
const draftStorageKey = "nimc-fep-communications-draft";

const readSavedDraft = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(draftStorageKey) || "null");
    return {
      subject: typeof saved?.subject === "string" ? saved.subject : "",
      message: typeof saved?.message === "string" ? saved.message : "",
    };
  } catch (error) {
    console.error("NIMC FEP draft load failed:", error);
    return { subject: "", message: "" };
  }
};

const personalize = (value, fep) => value
  .replaceAll("{{name}}", fep.name || "there")
  .replaceAll("{{email}}", fep.email || "")
  .replaceAll("{{company}}", "VOLSUS Energy Limited")
  .replaceAll("{{city}}", "Benin City");

const whatsappUrl = (phone, message) => {
  let number = String(phone || "").replace(/\D/g, "");
  if (number.startsWith("0")) number = `234${number.slice(1)}`;
  if (number.length < 7 || number.length > 15) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

export default function NimcFepManagement() {
  const { success, error: toastError } = useToast();
  const [feps, setFeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingFep, setEditingFep] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyFep);
  const [draft, setDraft] = useState(readSavedDraft);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/admin/nimc-feps")
      .then((response) => {
        if (!cancelled) setFeps(response.data?.feps || []);
      })
      .catch((loadError) => {
        console.error("NIMC FEP directory load failed:", loadError);
        if (!cancelled) toastError(loadError.response?.data?.message || "Could not load NIMC FEPs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [toastError]);

  const activeCount = feps.filter((fep) => fep.active !== false).length;
  const filteredFeps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return feps.filter((fep) => {
      if (statusFilter === "active" && fep.active === false) return false;
      if (statusFilter === "archived" && fep.active !== false) return false;
      const searchable = `${fep.name} ${fep.email || ""} ${fep.whatsapp || ""} ${fep.notes || ""}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [feps, query, statusFilter]);
  const selectedFeps = feps.filter((fep) => selectedIds.includes(String(fep._id)) && fep.active !== false);

  const openCreateForm = () => {
    setEditingFep(null);
    setForm(emptyFep);
    setShowForm(true);
  };

  const openEditForm = (fep) => {
    setEditingFep(fep);
    setForm({
      name: fep.name || "",
      whatsapp: fep.whatsapp || "",
      email: fep.email || "",
      notes: fep.notes || "",
    });
    setShowForm(true);
  };

  const saveFep = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
      };
      const response = editingFep
        ? await api.put(`/api/admin/nimc-feps/${editingFep._id}`, payload)
        : await api.post("/api/admin/nimc-feps", payload);
      const savedFep = response.data?.fep;
      if (!savedFep?._id) throw new Error("The saved FEP was not returned by the server.");
      setFeps((current) => editingFep
        ? current.map((fep) => String(fep._id) === String(savedFep._id) ? savedFep : fep)
        : [...current, savedFep]);
      setShowForm(false);
      setEditingFep(null);
      setForm(emptyFep);
      success(editingFep ? "FEP details updated." : "FEP added to the directory.");
    } catch (saveError) {
      console.error("NIMC FEP save failed:", saveError);
      toastError(saveError.response?.data?.message || "Could not save this FEP.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (fep) => {
    try {
      const response = await api.put(`/api/admin/nimc-feps/${fep._id}`, { active: fep.active === false });
      setFeps((current) => current.map((item) => String(item._id) === String(fep._id) ? response.data.fep : item));
      if (fep.active !== false) setSelectedIds((current) => current.filter((id) => id !== String(fep._id)));
      success(fep.active === false ? "FEP reactivated." : "FEP archived.");
    } catch (updateError) {
      console.error("NIMC FEP status update failed:", updateError);
      toastError(updateError.response?.data?.message || "Could not update this FEP.");
    }
  };

  const toggleSelected = (fep) => {
    const id = String(fep._id);
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const toggleVisibleSelection = () => {
    const visibleIds = filteredFeps.filter((fep) => fep.active !== false).map((fep) => String(fep._id));
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      success("Message draft saved in this browser.");
    } catch (saveError) {
      console.error("NIMC FEP draft save failed:", saveError);
      toastError("Could not save the message draft in this browser.");
    }
  };

  const allVisibleSelected = filteredFeps.filter((fep) => fep.active !== false).length > 0
    && filteredFeps.filter((fep) => fep.active !== false).every((fep) => selectedIds.includes(String(fep._id)));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Operations · VOLSUS Energy Limited</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">NIMC FEPs</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Manage the Benin City FEP directory and prepare personalized WhatsApp or email messages.
          </p>
        </div>
        <button type="button" onClick={openCreateForm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)]">
          <Plus size={17} aria-hidden="true" /> Add FEP
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Total FEPs</p><p className="mt-1 text-2xl font-bold">{feps.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Active FEPs</p><p className="mt-1 text-2xl font-bold">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Location</p><p className="mt-1 text-lg font-bold">Benin City, Edo</p>
        </div>
      </section>

      {showForm && (
        <form onSubmit={saveFep} className="space-y-4 rounded-2xl border border-[var(--accent)] bg-white p-5 shadow-sm dark:bg-slate-900">
          <div>
            <h3 className="font-bold">{editingFep ? "Edit FEP" : "Add FEP to VOLSUS Energy Limited"}</h3>
            <p className="mt-1 text-sm text-slate-500">This contact will be managed in the Benin City directory.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">FEP name
              <input required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="block text-sm font-medium">WhatsApp number
              <input required type="tel" maxLength={20} value={form.whatsapp} onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))} placeholder="+234…" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="block text-sm font-medium">Email address
              <input type="email" maxLength={254} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="block text-sm font-medium">Notes
              <input maxLength={500} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60">{busy ? "Saving…" : editingFep ? "Save changes" : "Add FEP"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingFep(null); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancel</button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search FEPs</span>
            <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, email or notes" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <label className="text-sm font-medium">
            <span className="sr-only">FEP status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="active">Active FEPs</option><option value="all">All FEPs</option><option value="archived">Archived FEPs</option>
            </select>
          </label>
        </div>
        {loading ? (
          <div role="status" className="p-10 text-center text-sm text-slate-500">Loading FEP directory…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3"><input type="checkbox" aria-label="Select all visible active FEPs" checked={allVisibleSelected} onChange={toggleVisibleSelection} /></th>
                  <th className="px-4 py-3">FEP</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFeps.map((fep) => (
                  <tr key={fep._id}>
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${fep.name}`} disabled={fep.active === false} checked={selectedIds.includes(String(fep._id))} onChange={() => toggleSelected(fep)} /></td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{fep.name}</p>
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{fep.notes || "VOLSUS Energy Limited · Benin City"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{fep.whatsapp || "No WhatsApp number"}</p>
                      <p className="mt-1 text-xs text-slate-500">{fep.email || "No email address"}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${fep.active === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>{fep.active === false ? "Archived" : "Active"}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openEditForm(fep)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700">Edit</button>
                        <button type="button" onClick={() => toggleActive(fep)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700">{fep.active === false ? "Reactivate" : "Archive"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredFeps.length && <div className="p-10 text-center text-sm text-slate-500"><Users size={22} className="mx-auto mb-2 text-slate-400" aria-hidden="true" />{feps.length ? "No FEPs match this search or status." : "No FEPs added yet. Add a contact to start managing your Benin City directory."}</div>}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="font-bold">FEP communications</h3>
          <p className="mt-1 text-sm text-slate-500">Select active FEPs above, write a message, then open a prepared WhatsApp chat or email draft for each.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(16rem,1.3fr)]">
          <label className="block text-sm font-medium">Email subject
            <input maxLength={120} value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <label className="block text-sm font-medium">Message draft
            <textarea rows={4} maxLength={4000} value={draft.message} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} placeholder="Use {{name}}, {{email}}, {{company}} and {{city}} to personalize the message." className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal leading-6 dark:border-slate-700 dark:bg-slate-950" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={saveDraft} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Save draft</button>
          <span className="text-sm text-slate-500">{selectedFeps.length} active FEP{selectedFeps.length === 1 ? "" : "s"} selected</span>
        </div>
        {!!selectedFeps.length && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {selectedFeps.map((fep) => {
              const message = personalize(draft.message, fep);
              const whatsapp = whatsappUrl(fep.whatsapp, message);
              const emailHref = fep.email
                ? `mailto:${fep.email}?subject=${encodeURIComponent(personalize(draft.subject, fep))}&body=${encodeURIComponent(message)}`
                : "";
              return (
                <li key={fep._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <span className="text-sm font-semibold">{fep.name}</span>
                  <span className="flex gap-2">
                    <a href={whatsapp || undefined} target="_blank" rel="noreferrer" aria-disabled={!whatsapp} onClick={(event) => { if (!whatsapp) event.preventDefault(); }} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${whatsapp ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}><MessageCircle size={14} aria-hidden="true" />WhatsApp</a>
                    <a href={emailHref || undefined} aria-disabled={!emailHref} onClick={(event) => { if (!emailHref) event.preventDefault(); }} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${emailHref ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}><Mail size={14} aria-hidden="true" />Email</a>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs leading-5 text-slate-500">WhatsApp opens a prefilled chat for review. Email opens a draft in your configured mail application; neither action sends until you confirm it there.</p>
      </section>
    </div>
  );
}
