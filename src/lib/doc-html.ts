export function unwrapFenced(text: string): string {
  let s = text.trim();
  s = s.replace(/^```(?:html|xml|xhtml|htm|markdown|md)?\s*/i, "");
  s = s.replace(/\s*```$/i, "");
  return s.trim();
}

export function looksLikeHtml(text: string): boolean {
  const s = unwrapFenced(text);
  return /<\/?(p|h[1-6]|div|span|ul|ol|li|table|tr|td|th|br|html|body|section|article|strong|em|b|i)\b/i.test(
    s,
  );
}

export function htmlToPlainText(html: string): string {
  if (typeof window === "undefined") return unwrapFenced(html);
  const doc = new DOMParser().parseFromString(sanitizeHtml(html), "text/html");
  return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(unwrapFenced(html), "text/html");
  doc
    .querySelectorAll("script,iframe,object,embed,link,meta,style,form,input,button")
    .forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "src" ||
        (name === "href" && /^\s*javascript:/i.test(value))
      ) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}
