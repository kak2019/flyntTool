type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

function isTextItem(item: unknown): item is PdfTextItem {
  if (!item || typeof item !== "object") return false;
  const rec = item as Record<string, unknown>;
  return (
    typeof rec.str === "string" &&
    Array.isArray(rec.transform) &&
    rec.transform.length >= 6
  );
}

const ONLY_LEADERS = /^[\s.·．…•\-—_]+$/;
const ONLY_PAGE = /^\d+[A-Za-z]?$/;
const LEADERS_AND_PAGE = /^[\s.·．…•\-—_]+\d+[A-Za-z]?$/;

function isTocFragment(line: string) {
  return ONLY_LEADERS.test(line) || ONLY_PAGE.test(line) || LEADERS_AND_PAGE.test(line);
}

/** Stick TOC leftovers (dots / page numbers) back onto the heading line. */
export function mergeLeaderFragments(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    const prev = out[out.length - 1];
    if (prev && prev !== "" && isTocFragment(line)) {
      out[out.length - 1] = `${prev} ${line}`.replace(/\s{2,}/g, " ").trim();
      continue;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Rebuild line breaks from pdf.js text items instead of joining everything with spaces. */
export function textContentToText(items: unknown[]): string {
  const rows = items.filter(isTextItem).flatMap((item) => {
    const str = item.str;
    if (!str) return [];
    return [
      {
        str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        w: item.width || 0,
        h: item.height || 10,
      },
    ];
  });

  if (!rows.length) return "";

  rows.sort((a, b) => b.y - a.y || a.x - b.x);

  type Line = {
    y: number;
    h: number;
    parts: { x: number; w: number; str: string }[];
  };
  const lines: Line[] = [];

  for (const row of rows) {
    const last = lines[lines.length - 1];
    const threshold = Math.max(last?.h ?? row.h, row.h) * 0.85;
    if (last && Math.abs(last.y - row.y) < threshold) {
      last.parts.push({ x: row.x, w: row.w, str: row.str });
      last.h = Math.max(last.h, row.h);
    } else {
      lines.push({
        y: row.y,
        h: row.h,
        parts: [{ x: row.x, w: row.w, str: row.str }],
      });
    }
  }

  const rawLines: string[] = [];
  let prevY: number | null = null;
  let prevH = 12;

  for (const line of lines) {
    line.parts.sort((a, b) => a.x - b.x);
    let text = "";
    let prevEnd: number | null = null;
    for (const part of line.parts) {
      if (prevEnd !== null) {
        const gap = part.x - prevEnd;
        const isDotty = /^[.\s·．…]+$/.test(part.str) || /^[.\s·．…]+$/.test(text.slice(-8));
        if (gap > Math.max(0.8, line.h * 0.12)) {
          text += isDotty ? "" : " ";
        }
      }
      text += part.str;
      prevEnd = part.x + (part.w || line.h * part.str.length * 0.45);
    }
    text = text.replace(/[ \t]{2,}/g, " ").trim();
    if (!text) continue;

    if (prevY !== null && prevY - line.y > prevH * 1.8) rawLines.push("");
    rawLines.push(text);
    prevY = line.y;
    prevH = line.h;
  }

  return mergeLeaderFragments(rawLines.join("\n"));
}

export const MIN_TEXT_LAYER_CHARS = 20;
