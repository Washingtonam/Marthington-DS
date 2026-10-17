import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Brain,
  Clock3,
  Lightbulb,
  Mic,
  MicOff,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/axios";

const categories = [
  "Business improvement",
  "Client lead",
  "Marketing partnership",
  "Other",
];

const emptyForm = {
  title: "",
  venture: "",
  category: categories[0],
  body: "",
  followUp: "",
};

function getStorageKey() {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Could not read the current user for Wild Thoughts storage:", error);
  }

  const identity = user.id || user._id || user.email || "super-admin";
  return `marthington:wild-thoughts:${encodeURIComponent(identity)}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function WildThoughts() {
  const storageKey = getStorageKey();
  const [thoughts, setThoughts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const speechRecognition = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadThoughts = async () => {
      setIsLoading(true);
      setLoadError(false);
      try {
        let legacyThoughts = [];
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
          if (!Array.isArray(saved)) throw new Error("Saved browser thoughts are not a list.");
          legacyThoughts = saved;
        } catch (error) {
          console.error("Could not read previous browser-saved thoughts:", error);
          toast.error("Previous browser-saved thoughts could not be read.");
        }

        const response = await api.get("/api/admin/wild-thoughts");
        let loadedThoughts = (response.data?.thoughts || []).map(normalizeThought);
        if (legacyThoughts.length) {
          const existingIds = new Set(loadedThoughts.map((thought) => thought.id));
          const pendingMigration = legacyThoughts.filter((thought) => !existingIds.has(
            String(thought.id || "").replace(/[^\w-]/g, "-").slice(0, 100),
          ));
          const migratedThoughts = [];
          for (const legacyThought of pendingMigration) {
            const migrationId = String(legacyThought.id || `${legacyThought.title}-${legacyThought.createdAt}`)
              .replace(/[^\w-]/g, "-")
              .slice(0, 100);
            const migrated = await api.post("/api/admin/wild-thoughts", {
              id: migrationId || `legacy-${Date.now()}`,
              title: legacyThought.title,
              venture: legacyThought.venture || "",
              category: legacyThought.category || categories[0],
              body: legacyThought.body,
              followUp: legacyThought.followUp || "",
            });
            migratedThoughts.push(normalizeThought(migrated.data.thought));
          }
          if (migratedThoughts.length) {
            loadedThoughts = [...migratedThoughts, ...loadedThoughts];
            toast.success("Previous browser-saved thoughts were imported to your account.");
          }
          if (loadedThoughts.length >= legacyThoughts.length) localStorage.removeItem(storageKey);
        }
        if (!cancelled) setThoughts(loadedThoughts);
      } catch (error) {
        console.error("Could not load Wild Thoughts:", error);
        if (!cancelled) {
          setLoadError(true);
          toast.error(error.response?.data?.message || "Could not load Wild Thoughts. Please try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void loadThoughts();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => () => speechRecognition.current?.stop(), []);

  const persistThought = async (thoughtId, thought) => {
    setIsSaving(true);
    try {
      const response = thoughtId
        ? await api.put(`/api/admin/wild-thoughts/${encodeURIComponent(thoughtId)}`, thought)
        : await api.post("/api/admin/wild-thoughts", thought);
      const savedThought = normalizeThought(response.data.thought);
      setThoughts((current) => thoughtId
        ? current.map((item) => (item.id === thoughtId ? savedThought : item))
        : [savedThought, ...current]);
      return true;
    } catch (error) {
      console.error("Could not save Wild Thought:", error);
      toast.error(error.response?.data?.message || "Could not save your thought. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveThought = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const body = form.body.trim();
    if (!title || !body) {
      toast.error("Add a title and the thought before saving.");
      return;
    }

    const nextThought = {
      title,
      venture: form.venture.trim(),
      category: form.category,
      body,
      followUp: form.followUp.trim(),
    };

    if (await persistThought(editingId, nextThought)) {
      resetForm();
      toast.success(editingId ? "Thought updated." : "Thought saved.");
    }
  };

  const editThought = (thought) => {
    setEditingId(thought.id);
    setForm({
      title: thought.title || "",
      venture: thought.venture || "",
      category: thought.category || categories[0],
      body: thought.body || "",
      followUp: thought.followUp || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteThought = async (thought) => {
    if (!window.confirm(`Delete "${thought.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/wild-thoughts/${encodeURIComponent(thought.id)}`);
      setThoughts((current) => current.filter((item) => item.id !== thought.id));
      if (editingId === thought.id) resetForm();
      toast.success("Thought deleted.");
    } catch (error) {
      console.error("Could not delete Wild Thought:", error);
      toast.error(error.response?.data?.message || "Could not delete this thought. Please try again.");
    }
  };

  const toggleVoiceCapture = () => {
    if (isListening) {
      speechRecognition.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error("Voice-to-text is not supported in this browser. You can type your thought instead.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) {
        setForm((previous) => ({
          ...previous,
          body: previous.body ? `${previous.body.trim()} ${transcript}` : transcript,
        }));
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        toast.error(`Voice capture failed: ${event.error || "please try again"}.`);
      }
    };
    recognition.onend = () => setIsListening(false);
    speechRecognition.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Could not start voice capture:", error);
      toast.error("Could not start voice capture. Check microphone permission and try again.");
      setIsListening(false);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const visibleThoughts = thoughts.filter((thought) => {
    const matchesCategory = categoryFilter === "All" || thought.category === categoryFilter;
    const searchableText = [
      thought.title,
      thought.venture,
      thought.category,
      thought.body,
      thought.followUp,
    ].join(" ").toLowerCase();
    return matchesCategory && searchableText.includes(normalizedSearch);
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Wild Thoughts</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Capture ideas as they come, sort them by venture, and turn promising thoughts into action.
        </p>
      </header>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-indigo-100">
              <Brain size={16} aria-hidden="true" /> Your ideas, organized
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl">A home for the next good idea.</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">
              Keep business improvements, digital-services leads, and marketing opportunities together, with each thought linked to the venture it belongs to.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4">
            <Lightbulb size={24} className="text-amber-300" aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold">{thoughts.length}</p>
              <p className="text-xs text-indigo-100">saved thoughts</p>
            </div>
          </div>
        </div>
      </section>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <span>Thoughts could not be loaded. Your saved data has not been changed.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingId ? "Update a thought" : "Capture a thought"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose the venture and type so it is easy to find again.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={16} aria-hidden="true" /> Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={saveThought} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            Thought title
            <input
              aria-label="Thought title"
              required
              maxLength={120}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="e.g. Follow up with computer repair customer"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            Business or venture
            <input
              aria-label="Business or venture"
              maxLength={100}
              value={form.venture}
              onChange={(event) => setForm({ ...form, venture: event.target.value })}
              placeholder="e.g. Marthington BMS, Digital Services"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            Thought type
            <select
              aria-label="Thought type"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            >
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Thought or details
            <textarea
              aria-label="Thought or details"
              required
              rows={4}
              maxLength={5000}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              placeholder="Write the idea, opportunity, or next step..."
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Follow-up or contact details <span className="font-normal text-slate-400">(optional)</span>
            <input
              aria-label="Follow-up or contact details"
              maxLength={500}
              value={form.followUp}
              onChange={(event) => setForm({ ...form, followUp: event.target.value })}
              placeholder="e.g. Ask the CPA agent for a pilot proposal"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingId ? <Pencil size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {isSaving ? "Saving..." : editingId ? "Update thought" : "Save thought"}
            </button>
            <button
              type="button"
              onClick={toggleVoiceCapture}
              aria-pressed={isListening}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                isListening
                  ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {isListening ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
              {isListening ? "Stop voice-to-text" : "Dictate thought"}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Voice is transcribed into the details field when supported by your browser.
            </span>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search thoughts"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles, ventures, and notes"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-950"
            />
          </label>
          <select
            aria-label="Filter by thought type"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option>All</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>

        {isLoading ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Loading your saved thoughts...
          </p>
        ) : visibleThoughts.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleThoughts.map((thought) => (
              <article
                key={thought.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200">
                      {thought.category}
                    </span>
                    <h3 className="mt-3 break-words text-lg font-semibold text-slate-900 dark:text-white">{thought.title}</h3>
                    {thought.venture && (
                      <p className="mt-1 text-sm font-medium text-violet-700 dark:text-violet-300">{thought.venture}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => editThought(thought)}
                      aria-label={`Edit ${thought.title}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-700 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteThought(thought)}
                      aria-label={`Delete ${thought.title}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{thought.body}</p>
                {thought.followUp && (
                  <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                    <ArrowRight size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="whitespace-pre-wrap">{thought.followUp}</span>
                  </div>
                )}
                <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock3 size={14} aria-hidden="true" /> Updated {formatDate(thought.updatedAt || thought.createdAt)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <Lightbulb className="mx-auto text-amber-500" size={30} aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
              {thoughts.length ? "No thoughts match your search" : "Your notebook is ready"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {thoughts.length
                ? "Try another search or thought type."
                : "Save your first idea, client lead, or marketing opportunity above."}
            </p>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Thoughts are saved securely to your super-admin account and available across devices.
      </p>
    </main>
  );
}

function normalizeThought(thought) {
  return { ...thought, id: thought._id || thought.id };
}
