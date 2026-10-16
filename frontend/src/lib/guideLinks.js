export const getGuidePath = (article) => (
  article.audience === "agents"
    ? `/agent/guides/${encodeURIComponent(article.slug)}`
    : `/guides/${encodeURIComponent(article.slug)}`
);
