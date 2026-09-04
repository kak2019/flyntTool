export type RegexHit = {
  index: number;
  end: number;
  text: string;
  groups: (string | undefined)[];
  named: Record<string, string>;
};

export type RegexResult =
  | { ok: true; flags: string; matches: RegexHit[] }
  | { ok: false; error: string };

const FLAG_RE = /^[gimsuyvd]*$/;

export function parseSlashRegex(input: string): { pattern: string; flags: string } | null {
  const s = input.trim();
  if (s.length < 2 || !s.startsWith("/")) return null;
  const last = s.lastIndexOf("/");
  if (last <= 0) return null;
  const flags = s.slice(last + 1);
  if (!FLAG_RE.test(flags)) return null;
  return { pattern: s.slice(1, last), flags };
}

export function normalizeFlags(flags: string): string {
  return [...new Set(flags.replace(/\s/g, "").split(""))].join("");
}

function hitFromMatch(match: RegExpExecArray): RegexHit {
  const named: Record<string, string> = {};
  if (match.groups) {
    for (const [key, value] of Object.entries(match.groups)) {
      if (value !== undefined) named[key] = value;
    }
  }
  return {
    index: match.index,
    end: match.index + match[0].length,
    text: match[0],
    groups: match.slice(1),
    named,
  };
}

export function runRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern) return { ok: true, flags: "", matches: [] };
  const unique = normalizeFlags(flags);
  if (!FLAG_RE.test(unique)) {
    return { ok: false, error: `不认识的 flag：${unique}` };
  }
  try {
    const global = unique.includes("g");
    const sticky = unique.includes("y");
    const execFlags = global || sticky ? unique : `${unique}g`;
    const re = new RegExp(pattern, execFlags);
    const matches: RegexHit[] = [];
    let match: RegExpExecArray | null;
    let guard = 0;
    while ((match = re.exec(text)) !== null) {
      matches.push(hitFromMatch(match));
      if (match[0].length === 0) re.lastIndex += 1;
      if (!global) break;
      if (++guard > 5000) break;
    }
    return { ok: true, flags: unique, matches };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "正则不合法" };
  }
}

export function replaceRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
): { ok: true; text: string } | { ok: false; error: string } {
  if (!pattern) return { ok: true, text };
  const unique = normalizeFlags(flags);
  if (!FLAG_RE.test(unique)) {
    return { ok: false, error: `不认识的 flag：${unique}` };
  }
  try {
    return { ok: true, text: text.replace(new RegExp(pattern, unique), replacement) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "正则不合法" };
  }
}

export type HighlightSeg = { text: string; hit: boolean; nth?: number };

export function highlightSegs(text: string, matches: RegexHit[]): HighlightSeg[] {
  if (!text) return [];
  const segs: HighlightSeg[] = [];
  let cursor = 0;
  matches.forEach((match, nth) => {
    if (match.index < cursor) return;
    if (match.index > cursor) {
      segs.push({ text: text.slice(cursor, match.index), hit: false });
    }
    segs.push({
      text: match.end > match.index ? text.slice(match.index, match.end) : "",
      hit: true,
      nth,
    });
    cursor = Math.max(cursor, match.end, match.index);
  });
  if (cursor < text.length) segs.push({ text: text.slice(cursor), hit: false });
  return segs;
}
