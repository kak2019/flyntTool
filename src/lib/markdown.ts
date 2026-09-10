import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true, async: false });

export function markdownToHtml(source: string): string {
  if (!source.trim()) return "";
  const html = marked.parse(source, { async: false }) as string;
  return sanitizeMarkdownHtml(html);
}

export function sanitizeMarkdownHtml(html: string): string {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,link,meta,style,form,button").forEach((el) => el.remove());
  doc.querySelectorAll("input").forEach((el) => {
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      el.disabled = true;
      el.removeAttribute("name");
      return;
    }
    el.remove();
  });
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith("on") || name === "srcdoc") {
        el.removeAttribute(attr.name);
        continue;
      }
      if (name === "href") {
        if (!/^\s*(https?:|mailto:|#|\/)/i.test(value)) el.removeAttribute(attr.name);
        continue;
      }
      if (name === "src") {
        const okImg = el.tagName === "IMG" && /^\s*(https?:|data:image\/)/i.test(value);
        if (!okImg) el.removeAttribute(attr.name);
      }
    }
  });
  doc.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noreferrer noopener");
  });
  return doc.body.innerHTML;
}
