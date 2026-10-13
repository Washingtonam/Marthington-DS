import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../lib/axios";
import { renderArticleBody } from "../../lib/articleBody";

export default function GuideArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loadedSlug, setLoadedSlug] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/articles/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (cancelled) return;
        setArticle(data.article);
        setError("");
        setLoadedSlug(slug);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError.response?.status === 404 ? "This guide is unavailable." : "Unable to load this guide right now.");
        setLoadedSlug(slug);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const loading = loadedSlug !== slug;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-5 py-5"><Link to="/guides" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700"><ArrowLeft size={17} /> All guides</Link></div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
        {loading ? <p className="py-16 text-center text-slate-500">Loading guide...</p>
          : error ? <div role="alert" className="py-16 text-center"><h1 className="text-2xl font-bold">{error}</h1><Link to="/guides" className="mt-4 inline-block font-semibold text-blue-700">Browse published guides</Link></div>
            : article && <>
              <p className="text-sm font-bold uppercase text-blue-700">{article.category || "NIMC Guide"}</p>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{article.title}</h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">{article.summary}</p>
              <p className="mt-5 border-b border-slate-200 pb-5 text-sm text-slate-500">Published {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "recently"}</p>
              <div className="article-content py-8 text-base leading-8 text-slate-800 [&_a]:text-blue-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_h2]:my-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:my-4 [&_h3]:text-xl [&_h3]:font-bold [&_img]:my-5 [&_img]:max-h-[42rem] [&_img]:max-w-full [&_img]:rounded-md [&_li]:ml-6 [&_ol]:my-4 [&_ol]:list-decimal [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: renderArticleBody(article.body) }} />
              {article.sourceName && <p className="border-t border-slate-200 pt-5 text-sm text-slate-600">Source: {article.sourceUrl ? <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">{article.sourceName}</a> : article.sourceName}</p>}
              <p className="mt-8 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-slate-700">This is general guidance from Marthington, not an official NIMC notice or a guarantee of service outcomes. Confirm current requirements with the linked source.</p>
              <a href="https://wa.me/2348073200555" target="_blank" rel="noreferrer" className="mt-8 inline-flex rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">WhatsApp Support</a>
            </>}
      </article>
    </main>
  );
}