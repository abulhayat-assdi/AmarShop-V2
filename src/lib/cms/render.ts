import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Server-only. Turns a content entry's raw markdown into the HTML string
// rendered on the storefront (and the admin preview). marked does the
// markdown; sanitize-html is the security boundary — an allowlist, so
// anything not named here (script/style/iframe/event handlers/
// javascript: URLs) is dropped. Never render an entry's body without
// going through this.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "strong",
    "em",
    "code",
    "pre",
    "hr",
    "br",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "nofollow noopener noreferrer",
      target: "_blank",
    }),
  },
};

export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown ?? "", { gfm: true, breaks: true }) as string;
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
