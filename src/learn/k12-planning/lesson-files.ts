type Block = Record<string, unknown>;

export type LessonSource = {
  shared?: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
};

const FIELD_LABELS: Record<string, string> = {
  publisher: "出版社",
  grade: "年级",
  volume: "册次",
  unit: "单元",
  topic: "课题",
  page: "页码",
  error: "表现",
  reason: "原因",
  support: "应对",
  basic: "基础",
  variant: "变式",
  open: "开放",
};

const IDENTITY = new Set([
  "grade",
  "subject",
  "duration",
  "curriculum",
  "standard_code",
  "standard_text",
  "prerequisite_standard",
  "smps",
]);

export function splitPlanningReply(text: string) {
  const open = text.search(/```lesson-json\b/i);
  if (open < 0) return { prose: text.trim(), source: null as LessonSource | null, streaming: false };
  const prose = text.slice(0, open).trim();
  const rest = text.slice(open).replace(/^```lesson-json[^\n]*\n?/i, "");
  const close = rest.lastIndexOf("```");
  if (close < 0) return { prose, source: null, streaming: true };
  const raw = rest.slice(0, close).trim();
  try {
    const parsed = JSON.parse(raw) as LessonSource;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.documents)) {
      return { prose, source: null, streaming: false };
    }
    return { prose, source: parsed, streaming: false };
  } catch {
    return { prose, source: null, streaming: false };
  }
}

export function lessonMarkdown(source: LessonSource) {
  const shared = source.shared ?? {};
  return (source.documents ?? []).map((doc) => {
    const audience = doc.audience === "student" ? "student" : "teacher";
    const title = textOf(doc.title) || textOf(doc.id) || "材料";
    const lines = [`# ${title}`];
    const meta = [textOf(doc.eyebrow), textOf(doc.meta)].filter(Boolean).join(" · ");
    if (meta) lines.push("", meta);
    const sections = Array.isArray(doc.sections) ? doc.sections : [];
    for (const section of sections) {
      if (!section || typeof section !== "object") continue;
      const heading = textOf((section as Block).heading);
      if (heading) lines.push("", `## ${heading}`);
      lines.push("", blocksToMd(asBlocks((section as Block).blocks), shared, audience));
    }
    return { name: fileName(title, textOf(doc.id) || "lesson"), text: lines.join("\n").trim() + "\n" };
  });
}

export function lessonPreview(source: LessonSource) {
  return lessonMarkdown(source)
    .map((file) => file.text)
    .join("\n\n");
}

function fileName(title: string, id: string) {
  const base = (title || id).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").trim() || id || "材料";
  return `${base.slice(0, 80)}.md`;
}

function textOf(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed && typeof parsed === "object") {
          const flat = textOf(parsed);
          if (flat) return flat;
        }
      } catch {
        /* keep the original sentence */
      }
    }
    return trimmed;
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join("、");
  if (value && typeof value === "object") {
    const row = value as Block;
    if (typeof row.text === "string" && Object.keys(row).every((key) => key === "text" || key === "type" || key === "label")) {
      return textOf(row.text);
    }
    return Object.entries(row)
      .filter(([key]) => key !== "type")
        .map(([key, item]) => {
          const body = textOf(item);
          const label = FIELD_LABELS[key] || key;
          return body ? `${label}：${body}` : "";
        })
      .filter(Boolean)
      .join("；");
  }
  return "";
}

function isBlock(value: unknown): value is Block {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && ("type" in value || "blocks" in value));
}

function asBlocks(value: unknown): Block[] {
  if (value == null || value === "") return [];
  if (isBlock(value)) return [value];
  if (Array.isArray(value)) {
    if (value.every(isBlock)) return value;
    return [{ type: "list", items: value.map((item) => textOf(item) || JSON.stringify(item)) }];
  }
  if (typeof value === "object") {
    const row = value as Block;
    if (Array.isArray(row.items)) return [{ type: "list", label: row.label, items: row.items }];
    if (row.text) return [{ type: row.label ? "labeled" : "paragraph", label: row.label, text: row.text }];
  }
  return textOf(value) ? [{ type: "paragraph", text: textOf(value) }] : [];
}

function facetText(value: unknown) {
  const blocks = asBlocks(value);
  if (!blocks.length || blocks.some((block) => block.type !== "paragraph" && block.type !== "list")) return "";
  return blocks
    .map((block) => (block.type === "list" ? listItems(block).map((item) => `- ${item}`).join("\n") : textOf(block.text)))
    .join("\n");
}

function expandShared(block: Block, shared: Record<string, unknown>, audience: string): Block[] {
  const key = textOf(block.key);
  if (key === "standard") {
    const body = textOf(shared.standard_text) || textOf(shared.standard_basis);
    if (!body && !textOf(shared.standard_code)) return [];
    return [{ type: "callout", kind: "special", label: textOf(shared.standard_code) || "课程依据", text: body }];
  }
  const value = shared[key];
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return [];
  if (IDENTITY.has(key)) return [{ type: "paragraph", text: String(value) }];
  let out: Block[];
  if (value && typeof value === "object" && !Array.isArray(value) && !isBlock(value)) {
    const row = value as Block;
    if ("teacher" in row || "student" in row || "stimulus" in row) out = expandFacet(row, audience);
    else out = asBlocks(value);
  } else {
    out = asBlocks(value);
  }
  const label = textOf(block.label);
  if (label && out.length) {
    const first = out[0];
    if (first.label) out[0] = { ...first, label: `${label}. ${textOf(first.label)}` };
    else if (first.text) out[0] = { type: "labeled", label, text: first.text };
  }
  return out;
}

function expandFacet(value: Block, audience: string): Block[] {
  const stimulus = asBlocks(value.stimulus);
  if (audience !== "teacher") return [...asBlocks(value.student), ...stimulus];
  const teacher = asBlocks(value.teacher);
  const teacherText = facetText(value.teacher);
  const studentText = facetText(value.student);
  const out = [...stimulus];
  if (teacher.length === 1 && teacher[0].type === "list") out.push(teacher[0]);
  else if (teacherText) out.push({ type: "paragraph", text: teacherText });
  else out.push(...teacher);
  if (studentText) out.push({ type: "labeled", label: "学生任务", text: studentText });
  else out.push(...asBlocks(value.student));
  return out;
}

function unwrapShared(block: Block): Block {
  const text = block.text;
  if (!text || typeof text !== "object" || Array.isArray(text)) return block;
  const inner = text as Block;
  const key = textOf(inner.key) || textOf(inner.from_shared);
  if (!key || (inner.type !== "from_shared" && !inner.from_shared)) return block;
  return { type: "from_shared", key, label: block.label ?? inner.label };
}

function expandBlocks(blocks: Block[], shared: Record<string, unknown>, audience: string): Block[] {
  const out: Block[] = [];
  for (const raw of blocks) {
    const block = unwrapShared(raw);
    if (block.type === "from_shared") out.push(...expandShared(block, shared, audience));
    else if (block.type === "columns") {
      out.push({
        type: "columns",
        left: expandBlocks(asBlocks(block.left), shared, audience),
        right: expandBlocks(asBlocks(block.right), shared, audience),
      });
    } else if (block.type === "group") {
      out.push({ ...block, blocks: expandBlocks(asBlocks(block.blocks), shared, audience) });
    } else out.push(block);
  }
  return out;
}

function listItems(block: Block) {
  return Array.isArray(block.items) ? block.items.map((item) => textOf(item) || String(item)) : [];
}

function blocksToMd(blocks: Block[], shared: Record<string, unknown>, audience: string): string {
  return expandBlocks(blocks, shared, audience)
    .map((block) => blockToMd(block, shared, audience))
    .filter(Boolean)
    .join("\n\n");
}

function blockToMd(block: Block, shared: Record<string, unknown>, audience: string): string {
  const type = textOf(block.type);
  if (type === "paragraph" || type === "instructions") return textOf(block.text);
  if (type === "labeled" || type === "callout") {
    const label = textOf(block.label);
    const body = textOf(block.text);
    return label ? `**${label}** ${body}`.trim() : body;
  }
  if (type === "h2") return `## ${textOf(block.text)}`;
  if (type === "h3") return `### ${textOf(block.text)}`;
  if (type === "list") {
    const label = textOf(block.label);
    const items = listItems(block).map((item) => `- ${item}`);
    return [label ? `**${label}**` : "", ...items].filter(Boolean).join("\n");
  }
  if (type === "checklist") {
    const label = textOf(block.label);
    const items = listItems(block).map((item) => `- [ ] ${item}`);
    return [label ? `**${label}**` : "", ...items].filter(Boolean).join("\n");
  }
  if (type === "phase_header") return `### ${textOf(block.name)}（${textOf(block.minutes)} 分钟）`;
  if (type === "table") return tableMd(block);
  if (type === "fill_table") {
    const headers = Array.isArray(block.headers) ? block.headers.map((item) => textOf(item)) : [];
    const blanks = Number(block.blank_rows) || 3;
    const rows = Array.from({ length: blanks }, () => headers.map(() => ""));
    return tableMd({ headers, rows });
  }
  if (type === "cards") {
    const items = Array.isArray(block.items) ? block.items : [];
    return items
      .map((item) => {
        const row = (item && typeof item === "object" ? item : { text: item }) as Block;
        return `**${textOf(row.title)}** ${textOf(row.text)}`.trim();
      })
      .join("\n\n");
  }
  if (type === "source_card") {
    return [`**${textOf(block.title)}**`, textOf(block.excerpt), [textOf(block.author), textOf(block.origin)].filter(Boolean).join(" · ")]
      .filter(Boolean)
      .join("\n\n");
  }
  if (type === "workspace") return "\n\n（作答留白）\n";
  if (type === "number_line") return `数轴：${textOf(block.min)} 到 ${textOf(block.max)}`;
  if (type === "group") return blocksToMd(asBlocks(block.blocks), shared, audience);
  if (type === "columns") {
    return [blocksToMd(asBlocks(block.left), shared, audience), blocksToMd(asBlocks(block.right), shared, audience)]
      .filter(Boolean)
      .join("\n\n");
  }
  if (type === "page_break") return "";
  return textOf(block.text);
}

function tableMd(block: Block) {
  const headers = Array.isArray(block.headers) ? block.headers.map((item) => textOf(item) || " ") : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  const width = Math.max(headers.length, ...rows.map((row) => (Array.isArray(row) ? row.length : 1)), 1);
  const head = headers.length ? headers : Array.from({ length: width }, () => " ");
  while (head.length < width) head.push(" ");
  const line = (cells: string[]) => `| ${cells.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`;
  const body = rows.map((row) => {
    const cells = Array.isArray(row) ? row.map((cell) => textOf(cell)) : [textOf(row)];
    while (cells.length < width) cells.push("");
    return line(cells);
  });
  return [line(head), line(head.map(() => "---")), ...body].join("\n");
}
