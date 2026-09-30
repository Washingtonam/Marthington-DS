import { useEffect, useState } from "react";
import { BookOpenText, Eye, FilePlus2, Loader2, Save, Trash2, X } from "lucide-react";
import ArticleBodyEditor from "../../components/admin/ArticleBodyEditor";
import api from "../../lib/axios";

const emptyArticle = {
  title: "",
  slug: "",
  summary: "",
  category: "NIMC Guide",
  body: "",
  sourceName: "",
  sourceUrl: "",
  status: "draft",
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "Not published";

export default function AdminArticles() {
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState(emptyArticle);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/articles");
      setArticles(response.data?.articles || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load articles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchArticles, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyArticle);
  };

  const editArticle = (article) => {
    setEditingId(article._id);
    setForm({ ...emptyArticle, ...article });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const saveArticle = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingId) await api.patch(`/api/admin/articles/${editingId}`, form);
      else await api.post("/api/admin/articles", form);
      setNotice(form.status === "published" ? "Article published." : "Draft saved.");
      resetForm();
      await fetchArticles();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save article.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (article) => {
    try {
      await api.patch(`/api/admin/articles/${article._id}`, { status: article.status === "published" ? "draft" : "published" });
      setNotice(article.status === "published" ? "Article unpublished." : "Article published.");
      await fetchArticles();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to change publication status.");
    }
  };

  const deleteArticle = async (article) => {
    if (!window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/articles/${article._id}`);
      if (editingId === article._id) resetForm();
      setNotice("Article deleted.");
      await fetchArticles();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete article.");
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div><p className="flex items-center gap-2 text-sm font-bold uppercase text-blue-700"><BookOpenText size={17} /> Public resources</p><h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Guides &amp; updates</h1><p className="mt-2 text-sm text-slate-500">Write practical guidance and control what visitors can read.</p></div>
        {editingId && <button onClick={resetForm} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700"><X size={16} /> Cancel edit</button>}
      </header>

      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="border-b border-slate-200 pb-8 dark:border-slate-800">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold dark:text-white">{editingId ? "Edit article" : "New article"}</h2></div>{!editingId && <FilePlus2 size={20} className="text-blue-700" />}</div>
        <form onSubmit={saveArticle} className="grid gap-4 md:grid-cols-2">
          <label><span className="mb-1 block text-sm font-semibold">Title</span><input required maxLength={120} value={form.title} onChange={(event) => updateField("title", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
          <label><span className="mb-1 block text-sm font-semibold">URL slug</span><input value={form.slug} onChange={(event) => updateField("slug", event.target.value)} placeholder="Generated from title if blank" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
          <label><span className="mb-1 block text-sm font-semibold">Category</span><input maxLength={80} value={form.category} onChange={(event) => updateField("category", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
          <label><span className="mb-1 block text-sm font-semibold">Publication</span><select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="draft">Save as draft</option><option value="published">Publish</option></select></label>
          <label className="md:col-span-2"><span className="mb-1 block text-sm font-semibold">Short summary</span><textarea maxLength={500} rows={2} value={form.summary} onChange={(event) => updateField("summary", event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
          <label className="md:col-span-2"><span className="mb-1 block text-sm font-semibold">Article body</span><ArticleBodyEditor value={form.body} onChange={(value) => updateField("body", value)} /></label>
          <label><span className="mb-1 block text-sm font-semibold">Source name</span><input maxLength={160} value={form.sourceName} onChange={(event) => updateField("sourceName", event.target.value)} placeholder="Official NIMC page" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
          <label><span className="mb-1 block text-sm font-semibold">Source URL</span><input type="url" value={form.sourceUrl} onChange={(event) => updateField("sourceUrl", event.target.value)} placeholder="https://..." className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
          <div className="flex gap-3 md:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{editingId ? "Save changes" : form.status === "published" ? "Publish article" : "Save draft"}</button>{editingId && <button type="button" onClick={resetForm} className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold dark:border-slate-700">Cancel</button>}</div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold dark:text-white">All articles</h2><span className="text-sm text-slate-500">{articles.length} total</span></div>
        {loading ? <p className="py-8 text-center text-slate-500">Loading articles...</p>
          : articles.length === 0 ? <p className="border-y border-dashed border-slate-300 py-8 text-center text-slate-500">No articles yet.</p>
            : <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{articles.map((article) => (
              <article key={article._id} className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase"><span className={article.status === "published" ? "text-emerald-700" : "text-amber-700"}>{article.status}</span><span className="text-slate-400">{article.category}</span><span className="font-normal normal-case text-slate-500">{formatDate(article.publishedAt)}</span></div><h3 className="mt-1 truncate font-bold dark:text-white">{article.title}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{article.summary}</p></div>
                <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => togglePublished(article)} title={article.status === "published" ? "Unpublish" : "Publish"} aria-label={article.status === "published" ? "Unpublish article" : "Publish article"} className="rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"><Eye size={17} /></button><button type="button" onClick={() => editArticle(article)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">Edit</button><button type="button" onClick={() => deleteArticle(article)} aria-label={`Delete ${article.title}`} className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50"><Trash2 size={17} /></button></div>
              </article>
            ))}</div>}
      </section>
    </main>
  );
}