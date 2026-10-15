import React, { useState } from "react";
import { Building2, ImagePlus, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useBranding } from "../../context/BrandingContext";
import api from "../../lib/axios";

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function BrandingSettings() {
  const { businessName, businessTagline, businessLogoUrl, applyBranding } = useBranding();
  const [formUpdates, setFormUpdates] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const form = { businessName, businessTagline, ...formUpdates };
  const updateForm = (field, value) => {
    setFormUpdates((current) => ({
      businessName,
      businessTagline,
      ...current,
      [field]: value,
    }));
  };

  const chooseLogo = (event) => {
    const file = event.target.files?.[0] || null;
    setError("");
    setNotice("");
    if (!file) return;
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoFile(null);
      setPreviewUrl("");
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoFile(null);
      setPreviewUrl("");
      setError("The logo must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setLogoFile(file);
    setRemoveLogo(false);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreviewUrl(reader.result);
    };
    reader.onerror = () => setError("Could not preview the selected logo.");
    reader.readAsDataURL(file);
  };

  const saveBranding = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const name = form.businessName.trim();
    const tagline = form.businessTagline.trim();
    if (!name || name.length > 100 || !tagline || tagline.length > 120) {
      setError("Enter a business name (up to 100 characters) and tagline (up to 120 characters).");
      return;
    }

    const payload = new FormData();
    payload.set("businessName", name);
    payload.set("businessTagline", tagline);
    if (logoFile) payload.set("logo", logoFile);
    if (removeLogo) payload.set("removeLogo", "true");

    setSaving(true);
    try {
      const response = await api.put("/api/admin/settings/branding", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!response.data?.branding) throw new Error("The server did not return the updated business identity.");
      applyBranding(response.data.branding);
      setFormUpdates({
        businessName: response.data.branding.businessName,
        businessTagline: response.data.branding.businessTagline,
      });
      setLogoFile(null);
      setPreviewUrl("");
      setRemoveLogo(false);
      setNotice("Business identity updated across the application.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to save business identity.");
    } finally {
      setSaving(false);
    }
  };

  const currentLogo = logoFile ? previewUrl : removeLogo ? "" : businessLogoUrl;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 pb-16 pt-6 sm:px-6">
      <header>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Super Admin</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Business settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Manage the shared business name and logo displayed throughout the application. Account appearance preferences remain personal to each user.
        </p>
      </header>

      <form onSubmit={saveBranding} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(var(--accent-rgb),0.10)] text-[var(--accent-text)]">
            <Building2 size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Shared business identity</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Changes are visible to all users and on the public pages.</p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</p>}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Business name</span>
              <input
                required
                maxLength={100}
                value={form.businessName}
                onChange={(event) => updateForm("businessName", event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--accent-focus)] focus:ring-4 focus:ring-[rgba(var(--accent-rgb),0.12)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Tagline</span>
              <input
                required
                maxLength={120}
                value={form.businessTagline}
                onChange={(event) => updateForm("businessTagline", event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--accent-focus)] focus:ring-4 focus:ring-[rgba(var(--accent-rgb),0.12)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Business logo</span>
            <div className="flex flex-col gap-4 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                {currentLogo
                  ? <img src={currentLogo} alt="Business logo preview" className="h-full w-full object-contain p-2" />
                  : <ImagePlus size={26} className="text-slate-400" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{logoFile ? logoFile.name : currentLogo ? "Current business logo" : "No logo uploaded"}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">JPG, PNG, or WebP; maximum 5 MB.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent-focus)] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    <ImagePlus size={16} className="mr-2" aria-hidden="true" />
                    Upload logo
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseLogo} className="sr-only" aria-label="Upload business logo" />
                  </label>
                  {businessLogoUrl && !removeLogo && (
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setPreviewUrl(""); setRemoveLogo(true); setError(""); setNotice(""); }}
                      className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={16} className="mr-2" aria-hidden="true" /> Remove logo
                    </button>
                  )}
                  {removeLogo && (
                    <button type="button" onClick={() => setRemoveLogo(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                      Keep current logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:bg-[var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-focus)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={17} className="mr-2 animate-spin" aria-hidden="true" /> : <Save size={17} className="mr-2" aria-hidden="true" />}
              {saving ? "Saving..." : "Save business identity"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
