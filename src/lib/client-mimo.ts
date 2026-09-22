import {
  parseMimoUsage,
  type MimoChatMessage,
  type MimoModelId,
  type MimoSource,
  type MimoUsage,
} from "@/lib/mimo";

export type MimoDelta = {
  content: string;
  reasoning: string;
  sources: MimoSource[];
  usage: MimoUsage | null;
};

export async function chatMimo(opts: {
  messages: MimoChatMessage[];
  model: MimoModelId;
  thinking?: boolean;
  search?: boolean;
  signal?: AbortSignal;
  onDelta?: (state: MimoDelta) => void;
}): Promise<MimoDelta> {
  const res = await fetch("/api/mimo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: opts.signal,
    body: JSON.stringify({
      messages: opts.messages,
      model: opts.model,
      thinking: opts.thinking === true,
      search: opts.search !== false,
      stream: true,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `请求失败（${res.status}）`);
  }

  const ctype = res.headers.get("content-type") || "";
  if (ctype.includes("text/event-stream") && res.body) {
    return readMimoSse(res.body, opts.onDelta);
  }

  const data = (await res.json()) as {
    text?: string;
    reasoning?: string;
    sources?: MimoSource[];
    usage?: Parameters<typeof parseMimoUsage>[0];
  };
  const out = {
    content: data.text ?? "",
    reasoning: data.reasoning ?? "",
    sources: data.sources ?? [],
    usage: parseMimoUsage(data.usage),
  };
  opts.onDelta?.(out);
  return out;
}

function collectSources(
  current: MimoSource[],
  incoming?: { url?: string; title?: string; site_name?: string }[],
) {
  if (!incoming?.length) return current;
  const next = [...current];
  const seen = new Set(next.map((item) => item.url));
  for (const item of incoming) {
    const url = String(item.url ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    next.push({
      url,
      title: String(item.title || item.site_name || url).trim(),
      site: String(item.site_name ?? "").trim() || undefined,
    });
  }
  return next;
}

async function readMimoSse(
  body: ReadableStream<Uint8Array>,
  onDelta?: (state: MimoDelta) => void,
): Promise<MimoDelta> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let reasoning = "";
  let sources: MimoSource[] = [];
  let usage: MimoUsage | null = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          error?: string;
          annotations?: { url?: string; title?: string; site_name?: string }[];
          usage?: Parameters<typeof parseMimoUsage>[0];
          choices?: {
            annotations?: { url?: string; title?: string; site_name?: string }[];
            delta?: {
              content?: string;
              reasoning_content?: string;
              annotations?: { url?: string; title?: string; site_name?: string }[];
            };
            message?: {
              content?: string;
              reasoning_content?: string;
              annotations?: { url?: string; title?: string; site_name?: string }[];
            };
          }[];
        };
        if (json.error) throw new Error(json.error);
        const piece = json.choices?.[0];
        const nextReason =
          piece?.delta?.reasoning_content ?? piece?.message?.reasoning_content ?? "";
        const nextContent = piece?.delta?.content ?? piece?.message?.content ?? "";
        const before = sources.length;
        sources = collectSources(
          sources,
          json.annotations ??
            piece?.annotations ??
            piece?.delta?.annotations ??
            piece?.message?.annotations,
        );
        const nextUsage = parseMimoUsage(json.usage);
        if (nextUsage) usage = nextUsage;
        if (nextReason) reasoning += nextReason;
        if (nextContent) content += nextContent;
        if (nextReason || nextContent || sources.length !== before || nextUsage) {
          onDelta?.({ content, reasoning, sources, usage });
        }
      } catch (err) {
        if (err instanceof Error && err.message && !err.message.startsWith("Unexpected")) {
          throw err;
        }
      }
    }
  }

  return { content, reasoning, sources, usage };
}
