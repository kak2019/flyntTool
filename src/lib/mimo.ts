export const MIMO_MODELS = [
  { id: "mimo-v2.6-pro-ultraspeed", label: "UltraSpeed" },
  { id: "mimo-v2.6-pro", label: "Pro" },
] as const;

export type MimoModelId = (typeof MIMO_MODELS)[number]["id"];

export type MimoRole = "user" | "assistant";

export type MimoSource = {
  url: string;
  title: string;
  site?: string;
};

export type MimoAttachment = {
  id: string;
  kind: "image" | "file";
  name: string;
  mime: string;
  dataUrl?: string;
  text?: string;
};

export type MimoChatMessage = {
  role: MimoRole;
  content: string;
  reasoning?: string;
  sources?: MimoSource[];
  attachments?: MimoAttachment[];
};

const IMAGE_DATA_RE = /^data:image\/(jpeg|jpg|png|gif|webp|bmp);base64,/i;

export function isMimoImageDataUrl(url: string, maxChars = 6_000_000) {
  return Boolean(url) && url.length <= maxChars && IMAGE_DATA_RE.test(url);
}

export function normalizeMimoAttachments(raw: unknown, max = 6, maxImageChars = 6_000_000): MimoAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: MimoAttachment[] = [];
  for (const item of raw.slice(0, max)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const name = String(rec.name ?? "").trim().slice(0, 200) || "附件";
    const mime = String(rec.mime ?? "").trim().slice(0, 80);
    const id = String(rec.id ?? name).slice(0, 80);
    if (rec.kind === "image") {
      const dataUrl = String(rec.dataUrl ?? "");
      if (!isMimoImageDataUrl(dataUrl, maxImageChars)) continue;
      out.push({ id, kind: "image", name, mime: mime || "image/jpeg", dataUrl });
      continue;
    }
    if (rec.kind === "file") {
      const text = String(rec.text ?? "").trim().slice(0, 20_000);
      if (!text) continue;
      out.push({ id, kind: "file", name, mime: mime || "text/plain", text });
    }
  }
  return out;
}

export function toMimoUpstreamMessages(messages: MimoChatMessage[]) {
  let lastImageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (
      messages[i].role === "user" &&
      messages[i].attachments?.some((item) => item.kind === "image" && item.dataUrl)
    ) {
      lastImageIndex = i;
      break;
    }
  }

  return messages.map((item, i) => {
    if (item.role === "assistant") {
      return item.reasoning
        ? { role: item.role, content: item.content, reasoning_content: item.reasoning }
        : { role: item.role, content: item.content };
    }

    const atts = item.attachments ?? [];
    const files = atts.filter((att) => att.kind === "file" && att.text);
    const images = atts.filter((att) => att.kind === "image");
    const liveImages = i === lastImageIndex ? images.filter((att) => att.dataUrl) : [];
    const parts: string[] = [];
    if (item.content) parts.push(item.content);
    for (const file of files) {
      parts.push(`【文件 ${file.name}】\n${file.text}`);
    }
    if (liveImages.length === 0 && images.length) {
      parts.push(`（此前发送过图片：${images.map((att) => att.name).join("、")}）`);
    }
    const text = parts.join("\n\n").trim() || (liveImages.length ? "请查看图片并回答。" : "请查看附件并回答。");

    if (!liveImages.length) {
      return { role: item.role, content: text };
    }
    return {
      role: item.role,
      content: [
        ...liveImages.map((att) => ({
          type: "image_url" as const,
          image_url: { url: att.dataUrl as string },
        })),
        { type: "text" as const, text },
      ],
    };
  });
}

export type MimoUsage = {
  prompt: number;
  completion: number;
  reasoning: number;
  total: number;
  search: number;
};

export const emptyMimoUsage = (): MimoUsage => ({
  prompt: 0,
  completion: 0,
  reasoning: 0,
  total: 0,
  search: 0,
});

export function addMimoUsage(a: MimoUsage, b: MimoUsage): MimoUsage {
  return {
    prompt: a.prompt + b.prompt,
    completion: a.completion + b.completion,
    reasoning: a.reasoning + b.reasoning,
    total: a.total + b.total,
    search: a.search + b.search,
  };
}

export function parseMimoUsage(raw?: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
  web_search_usage?: { tool_usage?: number };
} | null): MimoUsage | null {
  if (!raw) return null;
  const prompt = Number(raw.prompt_tokens) || 0;
  const completion = Number(raw.completion_tokens) || 0;
  const reasoning = Number(raw.completion_tokens_details?.reasoning_tokens) || 0;
  const total = Number(raw.total_tokens) || prompt + completion;
  const search = Number(raw.web_search_usage?.tool_usage) || 0;
  if (!prompt && !completion && !total && !search) return null;
  return { prompt, completion, reasoning, total, search };
}

export function isMimoModel(value: string): value is MimoModelId {
  return MIMO_MODELS.some((model) => model.id === value);
}
