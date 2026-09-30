import DOMPurify from "dompurify";
import linkifyHtml from "linkify-html";

const allowedTags = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "pre", "code", "a", "img",
];
const allowedAttributes = ["href", "target", "rel", "src", "alt", "title"];

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function getDriveImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "drive.google.com") return null;
    const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get("id");
    if (!fileId) return null;
    url.pathname = "/uc";
    url.search = "";
    url.searchParams.set("export", "view");
    url.searchParams.set("id", fileId);
    return url.href;
  } catch {
    return null;
  }
}

function getStandaloneImageUrl(value) {
  const driveUrl = getDriveImageUrl(value);
  if (driveUrl) return driveUrl;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && /\.(jpe?g|png|gif|webp|avif)$/i.test(url.pathname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function sanitize(value) {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    ALLOW_DATA_ATTR: false,
  });
}

export function renderArticleBody(body) {
  const value = String(body || "");
  if (/<(?:p|br|strong|b|em|i|u|s|h[23]|ul|ol|li|blockquote|pre|code|a|img)(?:\s|\/?>)/i.test(value)) {
    return sanitize(value);
  }

  const paragraphs = value.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "<p><br></p>";
    const imageUrl = getStandaloneImageUrl(trimmed);
    if (imageUrl) return `<p><img src="${escapeHtml(imageUrl)}" alt=""></p>`;
    return `<p>${linkifyHtml(escapeHtml(line), {
      defaultProtocol: "https",
      target: "_blank",
      rel: "noopener noreferrer",
    })}</p>`;
  });

  return sanitize(paragraphs.join(""));
}