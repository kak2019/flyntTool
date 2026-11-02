export type BisFileAction = {
  kind: "copy" | "skip";
  source: string;
  fileName: string;
  reason: string;
  dest?: string;
  docType?: string;
  upload?: string;
  noticeType?: string;
  merged?: string;
};

export type BisCase = {
  index: number;
  ref: string;
  client: string;
  folder: string;
  matched: boolean;
  note: string;
  files: BisFileAction[];
};

export type BisSummary = {
  cases: number;
  copied: number;
  translated: number;
  skipped: number;
  merged: number;
  raw: string;
};

export type BisLogReport = {
  meta: { key: string; value: string }[];
  notes: string[];
  summary: BisSummary | null;
  cases: BisCase[];
};

const CASE_RE = /^\[(\d+)\]\s+(\S+)/;
const SUMMARY_RE =
  /处理\s+(\d+)\s+个 Excel 内案件文件夹，新复制\s+(\d+)\s+个 PDF，补翻译\s+(\d+)\s+个，跳过\s+(\d+)\s+个 PDF，合成\s+(\d+)\s+个合并 PDF/;

function fileNameOf(path: string) {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function readDetails(lines: string[], start: number) {
  const file: BisFileAction = {
    kind: "skip",
    source: "",
    fileName: "",
    reason: "",
  };
  let j = start;
  while (j < lines.length && /^\s+\S/.test(lines[j]) && !CASE_RE.test(lines[j].trim())) {
    const detail = lines[j].trim();
    if (detail.startsWith("->")) file.dest = detail.slice(2).trim();
    else if (detail.startsWith("类型:")) file.docType = detail.slice("类型:".length).trim();
    else if (detail.startsWith("上传:")) file.upload = detail.slice("上传:".length).trim();
    else if (detail.startsWith("文书类型:")) file.noticeType = detail.slice("文书类型:".length).trim();
    else if (detail.startsWith("合并 PDF:")) file.merged = detail.slice("合并 PDF:".length).trim();
    else file.reason = file.reason ? `${file.reason}；${detail}` : detail;
    j += 1;
  }
  return { file, next: j };
}

export function parseBisLog(text: string): BisLogReport {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const meta: { key: string; value: string }[] = [];
  const notes: string[] = [];
  let summary: BisSummary | null = null;
  const cases: BisCase[] = [];
  let i = 0;

  while (i < lines.length && !CASE_RE.test(lines[i].trim())) {
    const line = lines[i].trim();
    i += 1;
    if (!line) continue;
    const done = line.match(SUMMARY_RE);
    if (line.startsWith("完成：") && done) {
      summary = {
        cases: Number(done[1]),
        copied: Number(done[2]),
        translated: Number(done[3]),
        skipped: Number(done[4]),
        merged: Number(done[5]),
        raw: line,
      };
      continue;
    }
    const field = line.match(/^([^:：]{1,80})[:：]\s*(.*)$/);
    if (field) meta.push({ key: field[1], value: field[2] });
    else notes.push(line);
  }

  while (i < lines.length) {
    const head = lines[i].trim().match(CASE_RE);
    if (!head) {
      const line = lines[i].trim();
      const done = line.match(SUMMARY_RE);
      if (line.startsWith("完成：") && done) {
        summary = {
          cases: Number(done[1]),
          copied: Number(done[2]),
          translated: Number(done[3]),
          skipped: Number(done[4]),
          merged: Number(done[5]),
          raw: line,
        };
      } else if (line) notes.push(line);
      i += 1;
      continue;
    }

    const item: BisCase = {
      index: Number(head[1]),
      ref: head[2],
      client: "",
      folder: "",
      matched: false,
      note: "",
      files: [],
    };
    i += 1;
    while (i < lines.length && !CASE_RE.test(lines[i].trim()) && !lines[i].trim().startsWith("完成：")) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith("客户文件夹:")) {
        item.client = trimmed.slice("客户文件夹:".length).trim();
      } else if (trimmed.startsWith("案卷文件夹:")) {
        const raw = trimmed.slice("案卷文件夹:".length).trim();
        const matched = raw.match(/^(.*)（(已匹配|未匹配)）$/);
        if (matched) {
          item.folder = matched[1].trim();
          item.matched = matched[2] === "已匹配";
        } else item.folder = raw;
      } else if (trimmed.startsWith("复制:") || trimmed.startsWith("跳过:")) {
        const kind = trimmed.startsWith("复制:") ? "copy" : "skip";
        const prefix = kind === "copy" ? "复制:" : "跳过:";
        const source = trimmed.slice(prefix.length).trim();
        const details = readDetails(lines, i + 1);
        details.file.kind = kind;
        details.file.source = source;
        details.file.fileName = fileNameOf(source);
        item.files.push(details.file);
        i = details.next;
        continue;
      } else if (trimmed) {
        item.note = item.note ? `${item.note}；${trimmed}` : trimmed;
      }
      i += 1;
    }
    cases.push(item);
  }

  return { meta, notes, summary, cases };
}

export type BisCopyRow = { ref: string; path: string };

export function bisCopyRows(report: BisLogReport): BisCopyRow[] {
  const rows: BisCopyRow[] = [];
  const seen = new Set<string>();
  for (const item of report.cases) {
    for (const file of item.files) {
      if (file.kind !== "copy") continue;
      const path = file.merged || file.dest;
      if (!path) continue;
      const key = `${item.ref}\t${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ ref: item.ref, path });
    }
  }
  return rows;
}

export function bisCopyTable(rows: BisCopyRow[]) {
  return rows.map((row) => `${row.ref}\t${row.path}`).join("\n");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function bisCopyHtml(rows: BisCopyRow[]) {
  const body = rows
    .map((row) => `<tr><td>${escapeHtml(row.ref)}</td><td>${escapeHtml(row.path)}</td></tr>`)
    .join("");
  return `<html><body><!--StartFragment--><table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>文号</th><th>L盘路径</th></tr></thead><tbody>${body}</tbody></table><!--EndFragment--></body></html>`;
}

export function bisCounts(report: BisLogReport) {
  let copiedFiles = 0;
  let skippedFiles = 0;
  let merged = 0;
  let copiedCases = 0;
  let noInFile = 0;
  const reasons = new Map<string, number>();
  for (const item of report.cases) {
    if (item.note.includes("没有 InFile")) noInFile += 1;
    if (item.files.some((file) => file.kind === "copy")) copiedCases += 1;
    for (const file of item.files) {
      if (file.kind === "copy") copiedFiles += 1;
      else skippedFiles += 1;
      if (file.merged) merged += 1;
      if (file.reason) reasons.set(file.reason, (reasons.get(file.reason) ?? 0) + 1);
    }
  }
  return {
    cases: report.cases.length,
    copiedCases,
    copiedFiles,
    skippedFiles,
    merged,
    noInFile,
    reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
  };
}
