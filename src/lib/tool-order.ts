import type { Tool, ToolCategoryId } from "@/lib/tools";

const KEY = "flynt-tool-order-v1";

export type ToolOrderMap = Partial<Record<ToolCategoryId, string[]>>;

export function loadToolOrder(): ToolOrderMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ToolOrderMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveToolOrder(order: ToolOrderMap) {
  localStorage.setItem(KEY, JSON.stringify(order));
}

export function orderedTools(tools: Tool[], saved?: string[]) {
  const byId = new Map(tools.map((tool) => [tool.id, tool]));
  const seen = new Set<string>();
  const out: Tool[] = [];
  for (const id of saved ?? []) {
    const tool = byId.get(id);
    if (!tool || seen.has(id)) continue;
    out.push(tool);
    seen.add(id);
  }
  for (const tool of tools) {
    if (!seen.has(tool.id)) out.push(tool);
  }
  return out;
}

export function swapIds(ids: string[], from: string, to: string) {
  if (from === to) return ids;
  const next = [...ids];
  const i = next.indexOf(from);
  const j = next.indexOf(to);
  if (i < 0 || j < 0) return ids;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
