import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenText, Search } from "lucide-react";
import api from "../../lib/axios";

export default function Guides() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/articles", { params: { limit: 50 } })
      .then(({ data }) => setArticles(data.articles || []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load guides right now."))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(articles.map((article) => article.category).filter(Boolean))];
  const filteredArticles = articles.filter((article) => {
    const matchesCategory = !category || article.category === category;
    const searchable = `${article.title} ${article.summary} ${article.category}`.toLowerCase();
    return matchesCategory && searchable.includes(search.toLowerCase().trim());
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="font-bold text-slate-900">Marthington <span className="font-normal text-slate-500">/ Guides</span></Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/login" className="text-slate-600 hover:text-slate-900">Login</Link>
            <Link to="/register" className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-blue-700">Apply for access</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="flex items-center gap-2 text-sm font-bold uppercase text-blue-700"><BookOpenText size={17} /> NIMC resource desk</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Guides &amp; updates</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">Practical information about identity record services, preparation, and next steps.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-md border border-slate-300 bg-slate-50 px-4 py-3">
              <Search size={18} className="shrink-0 text-slate-400" />
              <span className="sr-only">Search guides</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search guides and updates" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <label className="sr-only" htmlFor="guide-category">Filter by category</label>
            <select id="guide-category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm">
              <option value="">All topics</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Published resources</h2>
          {!loading && <span className="text-sm text-slate-500">{filteredArticles.length} results</span>}
        </div>
        {loading ? <p className="py-12 text-center text-slate-500">Loading resources...</p>
          : error ? <p role="alert" className="py-12 text-center text-red-700">{error}</p>
            : filteredArticles.length === 0 ? <p className="py-12 text-center text-slate-500">No guides match that search yet.</p>
              : <div className="divide-y divide-slate-200 border-y border-slate-200">
                {filteredArticles.map((article) => (
                  <article key={article._id} className="grid gap-3 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase text-blue-700">
                        <span>{article.category || "NIMC Guide"}</span>
                        <time className="font-normal normal-case text-slate-500" dateTime={article.publishedAt}>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ""}</time>
                      </div>
                      <h3 className="mt-2 text-xl font-bold"><Link to={`/guides/${article.slug}`} className="hover:text-blue-700">{article.title}</Link></h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{article.summary}</p>
                    </div>
                    <Link to={`/guides/${article.slug}`} aria-label={`Read ${article.title}`} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-700"><ArrowRight size={18} /></Link>
                  </article>
                ))}
              </div>}
        <aside className="mt-10 flex flex-col justify-between gap-4 border-l-4 border-emerald-600 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center">
          <div><h2 className="font-bold">Need help with a process?</h2><p className="mt-1 text-sm text-slate-600">Talk with our team about available assistance.</p></div>
          <a href="https://wa.me/2348073200555" target="_blank" rel="noreferrer" className="shrink-0 text-sm font-bold text-emerald-800 underline">WhatsApp Support</a>
        </aside>
        <p className="mt-6 text-xs leading-5 text-slate-500">These resources are general guidance from Marthington and are not official NIMC notices or a guarantee of service outcomes. Check the linked source for current requirements.</p>
      </section>
    </main>
  );
}