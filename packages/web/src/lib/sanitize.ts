import DOMPurify from "dompurify";

// Event descriptions are authored as HTML by lead coaches (TipTap) and shown to the
// public, so sanitize on render as defense-in-depth against stored XSS. We also pin
// <img> sources to our own /uploads/ paths so an injected external/data: URL can't
// be used to exfiltrate or track viewers.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "IMG") {
    const src = node.getAttribute("src") ?? "";
    if (!src.startsWith("/uploads/")) node.removeAttribute("src");
  }
  // Make links that open in a new tab safe.
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "h2", "h3", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "a", "img",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
};

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, CONFIG);
}
