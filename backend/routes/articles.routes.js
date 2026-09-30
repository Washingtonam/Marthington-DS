const express = require("express");
const Article = require("../models/Article.model");

const publicRouter = express.Router();
const adminRouter = express.Router();

const isSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Super admin access required." });
  }
  next();
};

const slugify = (value) => String(value || "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 160)
  .replace(/-+$/g, "");

const publicFields = "title slug summary category body sourceName sourceUrl publishedAt createdAt updatedAt";
const editableFields = ["title", "slug", "summary", "category", "body", "sourceName", "sourceUrl", "status"];

const pickFields = (body) => editableFields.reduce((payload, field) => {
  if (Object.prototype.hasOwnProperty.call(body, field)) payload[field] = body[field];
  return payload;
}, {});

const validatePayload = (payload, { partial = false } = {}) => {
  if (!partial && !String(payload.title || "").trim()) return "A title is required.";
  if (!partial && !String(payload.body || "").trim()) return "Article body is required.";
  if (payload.title !== undefined && (!String(payload.title).trim() || String(payload.title).length > 120)) return "Title must be between 1 and 120 characters.";
  if (payload.slug !== undefined && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug) || payload.slug.length > 160)) return "Slug may contain lowercase letters, numbers, and hyphens only.";
  if (payload.summary !== undefined && String(payload.summary).length > 500) return "Summary must be 500 characters or fewer.";
  if (payload.category !== undefined && String(payload.category).length > 80) return "Category must be 80 characters or fewer.";
  if (payload.body !== undefined && (!String(payload.body).trim() || String(payload.body).length > 50000)) return "Article body must be between 1 and 50000 characters.";
  if (payload.sourceName !== undefined && String(payload.sourceName).length > 160) return "Source name must be 160 characters or fewer.";
  if (payload.sourceUrl) {
    try {
      const url = new URL(payload.sourceUrl);
      if (!["http:", "https:"].includes(url.protocol)) return "Source URL must use HTTP or HTTPS.";
    } catch {
      return "Source URL must be a valid HTTP or HTTPS address.";
    }
  }
  if (payload.status !== undefined && !["draft", "published"].includes(payload.status)) return "Status must be draft or published.";
  return null;
};

publicRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50);
    const query = { status: "published", publishedAt: { $lte: new Date() } };
    if (req.query.category) query.category = String(req.query.category).slice(0, 80);

    const [articles, total] = await Promise.all([
      Article.find(query).select(publicFields).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Article.countDocuments(query),
    ]);

    return res.json({ success: true, articles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("PUBLIC ARTICLES ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load guides and updates." });
  }
});

publicRouter.get("/:slug", async (req, res) => {
  try {
    const article = await Article.findOne({
      slug: req.params.slug,
      status: "published",
      publishedAt: { $lte: new Date() },
    }).select(publicFields).lean();
    if (!article) return res.status(404).json({ success: false, message: "Article not found." });
    return res.json({ success: true, article });
  } catch (error) {
    console.error("PUBLIC ARTICLE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load this article." });
  }
});

adminRouter.use(isSuperAdmin);

adminRouter.get("/", async (req, res) => {
  try {
    const articles = await Article.find().sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, articles });
  } catch (error) {
    console.error("ADMIN ARTICLES ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load articles." });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const payload = pickFields(req.body || {});
    payload.slug = payload.slug ? slugify(payload.slug) : slugify(payload.title);
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    if (await Article.exists({ slug: payload.slug })) return res.status(409).json({ success: false, message: "That article URL is already in use." });

    const article = await Article.create({
      ...payload,
      publishedAt: payload.status === "published" ? new Date() : null,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });
    return res.status(201).json({ success: true, article });
  } catch (error) {
    console.error("CREATE ARTICLE ERROR:", error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: "That article URL is already in use." });
    return res.status(500).json({ success: false, message: "Unable to save article." });
  }
});

adminRouter.patch("/:id", async (req, res) => {
  try {
    const payload = pickFields(req.body || {});
    if (payload.slug !== undefined) payload.slug = slugify(payload.slug);
    const validationError = validatePayload(payload, { partial: true });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: "Article not found." });
    if (payload.slug && await Article.exists({ slug: payload.slug, _id: { $ne: article._id } })) {
      return res.status(409).json({ success: false, message: "That article URL is already in use." });
    }

    const wasPublished = article.status === "published";
    Object.assign(article, payload, { updatedBy: req.user.id });
    if (article.status === "published" && !wasPublished) article.publishedAt = new Date();
    await article.save();
    return res.json({ success: true, article });
  } catch (error) {
    console.error("UPDATE ARTICLE ERROR:", error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: "That article URL is already in use." });
    return res.status(500).json({ success: false, message: "Unable to update article." });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: "Article not found." });
    return res.json({ success: true, message: "Article deleted." });
  } catch (error) {
    console.error("DELETE ARTICLE ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to delete article." });
  }
});

module.exports = { publicRouter, adminRouter };