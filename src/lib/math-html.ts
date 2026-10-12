import katex from "katex";
import { markdownToHtml } from "@/lib/markdown";

export function mathMarkdownToHtml(source: string) {
  const blocks: string[] = [];
  const markedSource = source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
      blocks.push(renderTex(tex, true));
      return `\n\nMATHBLOCK${blocks.length - 1}END\n\n`;
    })
    .replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_, lead: string, tex: string) => {
      blocks.push(renderTex(tex, false));
      return `${lead}MATHBLOCK${blocks.length - 1}END`;
    });
  return markdownToHtml(markedSource).replace(/MATHBLOCK(\d+)END/g, (_, index: string) => blocks[Number(index)] ?? "");
}

function renderTex(tex: string, displayMode: boolean) {
  try {
    return katex.renderToString(tex.trim(), { displayMode, throwOnError: false });
  } catch {
    return tex;
  }
}
