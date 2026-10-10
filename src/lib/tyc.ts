export type TycCandidate = {
  key: string;
  name: string;
  creditCode: string;
  status: string;
  legalPerson: string;
  matchType: string;
};

export type TycField = { label: string; value: string };

export type TycController = { name: string; ratio: string };

export type TycChainNode = { name: string; via: string };

export type TycLine = { title: string; detail: string };

export type TycGroup = { title: string; lines: TycLine[] };

export type TycSection = {
  title: string;
  text: string;
  lines: TycLine[];
  groups: TycGroup[];
  total: number;
  note: string;
};

export type TycHolder = {
  name: string;
  entityType: string;
  ratio: string;
  amount: string;
  parentName: string;
  depth: number;
};

export type TycProfile = {
  name: string;
  summary: string;
  fields: TycField[];
  controllers: TycController[];
  chains: string[];
  chainNodes: TycChainNode[];
  holders: TycHolder[];
  ownershipNote: string;
  sections: TycSection[];
};

export type TycLookup = {
  candidates: TycCandidate[];
  profile: TycProfile | null;
  note: string;
};

const FIELD_LABELS: { keys: string[]; label: string }[] = [
  { keys: ["creditCode", "credit_code"], label: "统一社会信用代码" },
  { keys: ["regStatus", "reg_status"], label: "登记状态" },
  { keys: ["legalPersonName", "legalPerson", "legal_person_name"], label: "法定代表人" },
  { keys: ["regCapital", "reg_capital"], label: "注册资本" },
  { keys: ["actualCapital", "actual_capital"], label: "实缴资本" },
  { keys: ["estiblishTime", "establishTime", "estiblish_time"], label: "成立日期" },
  { keys: ["fromTime", "toTime"], label: "营业期限" },
  { keys: ["companyOrgType", "company_org_type"], label: "企业类型" },
  { keys: ["industry"], label: "行业" },
  { keys: ["regInstitute", "reg_institute"], label: "登记机关" },
  { keys: ["regLocation", "reg_location"], label: "注册地址" },
  { keys: ["staffNumRange", "staff_num_range"], label: "人员规模" },
  { keys: ["socialStaffNum", "social_staff_num"], label: "参保人数" },
  { keys: ["businessScope", "business_scope"], label: "经营范围" },
];

function coreUrl() {
  return (process.env.TYC_CORE_URL || "https://mcp.tianyancha.com/v1/core/tools/call").replace(/\/$/, "");
}

function authHeader() {
  const key = process.env.TYC_API_KEY?.trim();
  if (!key) throw new Error("未配置 TYC_API_KEY");
  return /^bearer\s+/i.test(key) ? key : `Bearer ${key}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function textOf(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && value > 1_000_000_000_000) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  }
  return String(value).trim();
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const text = textOf(record[key]);
    if (text && text !== "null" && text !== "undefined") return text;
  }
  return "";
}

function explainFailure(status: number, raw: string) {
  let detail = raw.slice(0, 240);
  try {
    const parsed = JSON.parse(raw) as { error?: string; error_description?: string; message?: string };
    detail = parsed.error_description || parsed.error || parsed.message || detail;
  } catch {
    // keep the raw slice
  }
  if (status === 401 || status === 403 || /无权限|300005/.test(detail)) {
    return "天眼查密钥无效，或当前会员看不了这项数据。";
  }
  if (status === 402 || /quota/i.test(detail)) {
    return "天眼查额度用完了。日额度次日零点重置，月额度下月 1 日重置。";
  }
  return `天眼查失败（${status}）：${detail}`;
}

async function callTool(name: string, args: Record<string, unknown>) {
  const res = await fetch(coreUrl(), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({ tool_name: name, arguments: args, format: "json" }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(explainFailure(res.status, raw));
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("天眼查没有返回 JSON");
  }
  const record = asRecord(parsed);
  if (record?.error) throw new Error(explainFailure(res.status, raw));
  const content = record?.content ?? parsed;
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as unknown;
    } catch {
      return { _summary: content };
    }
  }
  return content;
}

function rowsFrom(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item));
  const record = asRecord(payload);
  if (!record || record._empty === true) return [];
  for (const key of ["items", "list", "companies"]) {
    if (Array.isArray(record[key])) return rowsFrom(record[key]);
  }
  const result = asRecord(record.result);
  if (result) return rowsFrom(result);
  if (pick(record, ["name", "creditCode"])) return [record];
  return [];
}

function toCandidate(record: Record<string, unknown>): TycCandidate | null {
  const name = pick(record, ["name", "companyName", "company_name"]);
  if (!name) return null;
  const creditCode = pick(record, ["creditCode", "credit_code"]);
  const id = pick(record, ["id", "companyId", "gid"]);
  return {
    key: creditCode || id || name,
    name,
    creditCode,
    status: pick(record, ["regStatus", "reg_status"]),
    legalPerson: pick(record, ["legalPersonName", "legalPerson", "legal_person_name"]),
    matchType: pick(record, ["matchType", "match_type"]),
  };
}

function sameName(left: string, right: string) {
  return left.replace(/\s+/g, "") === right.replace(/\s+/g, "");
}

function profileFrom(payload: unknown, fallbackName: string): TycProfile {
  const record = asRecord(payload) ?? {};
  const base = asRecord(asRecord(record.sources)?.base);
  const nested = (base && pick(base, ["name", "creditCode"]) ? base : null) ?? asRecord(record.result) ?? asRecord(record.data) ?? record;
  const termStart = pick(nested, ["fromTime"]);
  const termEnd = pick(nested, ["toTime"]);
  const fields: TycField[] = [];
  for (const item of FIELD_LABELS) {
    if (item.keys[0] === "fromTime") {
      if (termStart && termEnd) fields.push({ label: item.label, value: `${termStart} 至 ${termEnd}` });
      else if (termStart) fields.push({ label: "营业期限起", value: termStart });
      else if (termEnd) fields.push({ label: "营业期限止", value: termEnd });
      continue;
    }
    const value = pick(nested, item.keys);
    if (value) fields.push({ label: item.label, value });
  }
  return {
    name: pick(nested, ["name", "companyName"]) || fallbackName,
    summary: pick(nested, ["_summary"]),
    fields,
    controllers: [],
    chains: [],
    chainNodes: [],
    holders: [],
    ownershipNote: "",
    sections: [],
  };
}

function percentText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const scaled = value <= 1 ? value * 100 : value;
    return `${Math.round(scaled * 10000) / 10000}%`;
  }
  const text = textOf(value);
  if (!text || text.includes("%")) return text;
  const n = Number(text);
  if (!Number.isFinite(n)) return text;
  const scaled = n <= 1 ? n * 100 : n;
  return `${Math.round(scaled * 10000) / 10000}%`;
}

function chainFromPath(path: unknown) {
  if (!Array.isArray(path)) return "";
  const parts: string[] = [];
  let percent = "";
  for (const node of path) {
    const record = asRecord(node);
    if (!record) continue;
    if (record.type === "percent") {
      percent = textOf(record.value);
      continue;
    }
    const name = textOf(record.value);
    if (!name) continue;
    if (parts.length) parts.push(percent ? ` —${percent}→ ` : " → ");
    parts.push(name);
    percent = "";
  }
  return parts.join("");
}

function chainsFromControl(paths: unknown) {
  if (!Array.isArray(paths)) return [];
  const lines: string[] = [];
  for (const item of paths) {
    const record = asRecord(item);
    if (!record || record.kind === "unknown") continue;
    const relationships = Array.isArray(record.relationships) ? record.relationships : [];
    const hops = relationships.map((edge) => {
      const row = asRecord(edge);
      if (!row) return "";
      const props = asRecord(row.properties);
      const ratio = textOf(props?.percentStr) || percentText(props?.percent);
      const start = textOf(row.startName);
      const end = textOf(row.endName);
      if (!start || !end) return "";
      return `${start}${ratio ? ` ${ratio}` : ""} → ${end}`;
    }).filter(Boolean);
    const line = hops.join("，") || textOf(record.controlPath);
    if (line) lines.push(line);
  }
  return lines;
}

function holdersFrom(items: unknown): TycHolder[] {
  if (!Array.isArray(items)) return [];
  const holders: TycHolder[] = [];
  for (const item of items) {
    const record = asRecord(item);
    if (!record) continue;
    const depth = Number(record.depth);
    const name = textOf(record.name);
    if (!name || depth === 0) continue;
    holders.push({
      name,
      entityType: textOf(record.entityType),
      ratio: textOf(record.ratio) || percentText(record.percent),
      amount: textOf(record.amount),
      parentName: textOf(record.parentName),
      depth: Number.isFinite(depth) ? depth : 1,
    });
  }
  return holders.sort((a, b) => a.depth - b.depth);
}

function attachOwnership(profile: TycProfile, controller: unknown, equity: unknown, notes: string[]) {
  const control = asRecord(controller);
  const list = Array.isArray(control?.actualControllerList) ? control.actualControllerList : [];
  const seen = new Set<string>();
  for (const item of list) {
    const record = asRecord(item);
    const name = textOf(record?.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    profile.controllers.push({ name, ratio: percentText(record?.ratio) });
  }
  const equityRecord = asRecord(equity);
  const chain = chainFromPath(equityRecord?.path);
  const chains = chain ? [chain] : chainsFromControl(control?.controlPaths);
  profile.chains = [...new Set(chains)];
  profile.chainNodes = nodesFromPath(equityRecord?.path);
  if (!profile.chainNodes.length && profile.chains[0]) profile.chainNodes = nodesFromChain(profile.chains[0]);
  profile.holders = holdersFrom(equityRecord?.items);
  profile.ownershipNote = [...new Set(notes.filter(Boolean))].join(" ");
}

function nodesFromPath(path: unknown): TycChainNode[] {
  if (!Array.isArray(path)) return [];
  const nodes: TycChainNode[] = [];
  let via = "";
  for (const node of path) {
    const record = asRecord(node);
    if (!record) continue;
    if (record.type === "percent") {
      via = textOf(record.value);
      continue;
    }
    const name = textOf(record.value);
    if (!name) continue;
    nodes.push({ name, via: nodes.length ? via : "" });
    via = "";
  }
  return nodes;
}

function nodesFromChain(chain: string): TycChainNode[] {
  const bits = chain.split(/\s*—([^—]+?)→\s*/);
  if (bits.length < 3) return [];
  const nodes: TycChainNode[] = [{ name: bits[0], via: "" }];
  for (let i = 1; i < bits.length; i += 2) {
    const name = bits[i + 1];
    if (name) nodes.push({ name, via: bits[i] || "" });
  }
  return nodes;
}

function collectItems(payload: unknown) {
  const record = asRecord(payload);
  if (!record || record._empty === true) return [];
  const out: Record<string, unknown>[] = [];
  const take = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      const row = asRecord(item);
      if (row) out.push(row);
    }
  };
  take(record.items);
  const sources = asRecord(record.sources);
  if (sources) {
    for (const source of Object.values(sources)) {
      const row = asRecord(source);
      if (row && row.empty !== true) take(row.items);
    }
  }
  return out;
}

function totalOf(payload: unknown) {
  const record = asRecord(payload);
  if (!record) return 0;
  if (typeof record.total === "number" && record.total > 0) return record.total;
  const sources = asRecord(record.sources);
  if (!sources) return typeof record.total === "number" ? record.total : 0;
  return Object.values(sources).reduce((sum: number, source) => {
    const row = asRecord(source);
    return sum + (typeof row?.total === "number" ? row.total : 0);
  }, 0);
}

function clip(value: unknown, max = 96) {
  const text = textOf(value).replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function uniqueLines(lines: TycLine[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    if (!line.title) return false;
    const key = `${line.title}\n${line.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function listSection(title: string, result: { data: unknown; error: string }, toLines: (payload: unknown) => TycLine[]): TycSection {
  if (result.error) return { title, text: "", lines: [], groups: [], total: 0, note: result.error };
  const lines = uniqueLines(toLines(result.data)).slice(0, 8);
  const total = totalOf(result.data);
  return {
    title,
    text: "",
    lines,
    groups: [],
    total: Math.max(total, lines.length),
    note: lines.length ? "" : "没有查到",
  };
}

async function callOptional(name: string, args: Record<string, unknown>) {
  try {
    return { data: await callTool(name, args), error: "" };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "查询失败" };
  }
}

export async function searchCompanies(name: string) {
  const payload = await callTool("search_companies", { searchKey: name, pageNum: 1, pageSize: 8 });
  const seen = new Set<string>();
  const candidates: TycCandidate[] = [];
  for (const row of rowsFrom(payload)) {
    const candidate = toCandidate(row);
    if (!candidate || seen.has(candidate.key)) continue;
    seen.add(candidate.key);
    candidates.push(candidate);
  }
  return candidates;
}

const PAGE = { pageNum: 1, pageSize: 8 };

export async function loadCompany(searchKey: string, fallbackName = searchKey) {
  const args = { searchKey };
  const [registration, controller, equity, shareholders, personnel, investments, financing, team, products, competitors, beneficial, controlled, relation, about] =
    await Promise.all([
      callTool("get_company_registration_info", args),
      callOptional("get_actual_controller", args),
      callOptional("get_equity_ratio", args),
      callOptional("get_shareholder_info", { ...args, ...PAGE }),
      callOptional("get_key_personnel", { ...args, ...PAGE }),
      callOptional("get_external_investments", { ...args, ...PAGE }),
      callOptional("get_financing_records", { ...args, pageNum: 1, pageSize: 5 }),
      callOptional("get_team_members", { ...args, pageNum: 1, pageSize: 5 }),
      callOptional("get_products_info", { ...args, pageNum: 1, pageSize: 5 }),
      callOptional("get_competitors", { ...args, pageNum: 1, pageSize: 5 }),
      callOptional("get_beneficial_owners", { ...args, pageNum: 1, pageSize: 5 }),
      callOptional("get_controlled_companies", { ...args, ...PAGE }),
      callOptional("get_relation_graph", args),
      callOptional("get_company_profile", args),
    ]);
  const profile = profileFrom(registration, fallbackName);
  attachOwnership(profile, controller.data, equity.data, [controller.error, equity.error]);
  profile.sections = [
    aboutSection(about),
    listSection("股东信息", shareholders, shareholderLines),
    listSection("主要人员", personnel, personnelLines),
    listSection("对外投资", investments, investmentLines),
    developmentSection(financing, team, products, competitors),
    listSection("企业受益股东", beneficial, beneficialLines),
    listSection("实际控制权", controlled, controlledLines),
    relationSection(relation),
  ];
  return profile;
}

function aboutSection(result: { data: unknown; error: string }): TycSection {
  if (result.error) return { title: "企业简介", text: "", lines: [], groups: [], total: 0, note: result.error };
  const text = textOf(asRecord(result.data)?.profile);
  return { title: "企业简介", text, lines: [], groups: [], total: text ? 1 : 0, note: text ? "" : "没有查到" };
}

function shareholderLines(payload: unknown) {
  return collectItems(payload).map((row) => {
    const capital = Array.isArray(row.capital) ? asRecord(row.capital[0]) : null;
    return {
      title: textOf(row.name),
      detail: [textOf(capital?.percent) || textOf(row.percent), textOf(capital?.amomon)].filter(Boolean).join(" · "),
    };
  });
}

function personnelLines(payload: unknown) {
  return collectItems(payload).map((row) => ({
    title: textOf(row.name),
    detail: Array.isArray(row.typeJoin) ? row.typeJoin.map(textOf).filter(Boolean).join("、") : textOf(row.typeJoin),
  }));
}

function investmentLines(payload: unknown) {
  return collectItems(payload).map((row) => ({
    title: textOf(row.name),
    detail: [textOf(row.percent), textOf(row.regStatus), textOf(row.legalPersonName) && `法人 ${textOf(row.legalPersonName)}`, textOf(row.category)]
      .filter(Boolean)
      .join(" · "),
  }));
}

function financingLines(payload: unknown) {
  return collectItems(payload).map((row) => ({
    title: [textOf(row.round), textOf(row.investorName)].filter(Boolean).join(" · ") || textOf(row.newsTitle),
    detail: [textOf(row.money), textOf(row.pubTime).slice(0, 10)].filter(Boolean).join(" · "),
  }));
}

function teamLines(payload: unknown) {
  return collectItems(payload).map((row) => ({
    title: [textOf(row.name), textOf(row.title)].filter(Boolean).join(" · "),
    detail: clip(row.desc, 80),
  }));
}

function productLines(payload: unknown) {
  return collectItems(payload).map((row) => ({
    title: textOf(row.product) || textOf(row.name),
    detail: [textOf(row.business) || clip(row.brief, 60), textOf(row.industry) || textOf(row.classes)].filter(Boolean).join(" · "),
  }));
}

function competitorLines(payload: unknown) {
  return collectItems(payload).map((row) => ({
    title: textOf(row.competitorProduct) || textOf(row.companyName),
    detail: [textOf(row.industry), textOf(row.location), clip(row.business, 40)].filter(Boolean).join(" · "),
  }));
}

function beneficialLines(payload: unknown) {
  return collectItems(payload).map((row) => ({
    title: textOf(row.name),
    detail: clip(row.decisionReason, 80),
  }));
}

function controlledLines(payload: unknown) {
  return collectItems(payload).map((row) => ({
    title: textOf(row.name),
    detail: [textOf(row.percent), textOf(row.regStatus), textOf(row.legalPersonName) && `法人 ${textOf(row.legalPersonName)}`]
      .filter(Boolean)
      .join(" · "),
  }));
}

function developmentSection(
  financing: { data: unknown; error: string },
  team: { data: unknown; error: string },
  products: { data: unknown; error: string },
  competitors: { data: unknown; error: string },
): TycSection {
  const groups = [
    namedGroup("融资与投资", financing, financingLines),
    namedGroup("核心团队", team, teamLines),
    namedGroup("企业业务", products, productLines),
    namedGroup("竞品", competitors, competitorLines),
  ].filter((group): group is TycGroup => Boolean(group));
  const notes = [financing.error, team.error, products.error, competitors.error].filter(Boolean);
  return {
    title: "公司发展",
    text: "",
    lines: [],
    groups,
    total: groups.reduce((sum, group) => sum + group.lines.length, 0),
    note: groups.length ? [...new Set(notes)].join(" ") : notes[0] || "没有查到融资、团队、业务或竞品",
  };
}

function namedGroup(title: string, result: { data: unknown; error: string }, toLines: (payload: unknown) => TycLine[]): TycGroup | null {
  if (result.error) return { title, lines: [{ title: result.error, detail: "" }] };
  const lines = uniqueLines(toLines(result.data)).slice(0, 5);
  return lines.length ? { title, lines } : null;
}

function relationSection(result: { data: unknown; error: string }): TycSection {
  if (result.error) return { title: "企业关系", text: "", lines: [], groups: [], total: 0, note: result.error };
  const record = asRecord(result.data);
  const edges = Array.isArray(record?.edges) ? record.edges : [];
  const names = new Map<string, string>();
  if (Array.isArray(record?.items)) {
    for (const item of record.items) {
      const row = asRecord(item);
      if (row) names.set(textOf(row.id), textOf(row.name));
    }
  }
  const lines = edges.slice(0, 12).flatMap((edge) => {
    const row = asRecord(edge);
    if (!row) return [];
    const label = Array.isArray(row.labels) ? textOf(row.labels[0]) : textOf(row.type);
    const percent = textOf(row.percent);
    const target = names.get(textOf(row.targetId)) || "";
    const source = textOf(row.sourceName);
    if (!source) return [];
    return [{
      title: source,
      detail: [label, percent && percent !== "0" ? percent : "", target && `→ ${target}`].filter(Boolean).join(" "),
    }];
  });
  const total = typeof record?.edgeCount === "number" ? record.edgeCount : lines.length;
  return { title: "企业关系", text: "", lines, groups: [], total, note: lines.length ? "" : "没有查到" };
}

export async function lookupCompany(name: string): Promise<TycLookup> {
  const query = name.trim();
  const candidates = await searchCompanies(query);
  if (!candidates.length) {
    return { candidates: [], profile: null, note: "没有查到这家公司。试试工商登记的全称。" };
  }
  const exact = candidates.filter((item) => sameName(item.name, query));
  const chosen = candidates.length === 1 ? candidates[0] : exact.length === 1 ? exact[0] : null;
  if (!chosen) {
    return { candidates, profile: null, note: "对上了多家。点一家再查工商、股东、人员和股权。" };
  }
  const profile = await loadCompany(chosen.key, chosen.name);
  return {
    candidates,
    profile,
    note: candidates.length > 1 ? "已按全称选定这一家。其他结果仍可再点。" : "",
  };
}
