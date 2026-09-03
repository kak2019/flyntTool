export async function translateText(opts: {
  text: string;
  sourceLang: string;
  targetLang: string;
  onDelta?: (full: string) => void;
}): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: opts.text,
      sourceLang: opts.sourceLang,
      targetLang: opts.targetLang,
      stream: true,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `翻译失败（${res.status}）`);
  }

  const ctype = res.headers.get("content-type") || "";
  if (ctype.includes("text/event-stream") && res.body) {
    return readSse(res.body, opts.onDelta);
  }

  const data = (await res.json()) as { text?: string };
  const text = data.text ?? "";
  opts.onDelta?.(text);
  return text;
}

async function readSse(
  body: ReadableStream<Uint8Array>,
  onDelta?: (full: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = "";
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
          choices?: { delta?: { content?: string } }[];
        };
        const piece = json.choices?.[0]?.delta?.content ?? "";
        if (piece) {
          full += piece;
          onDelta?.(full);
        }
      } catch {
        // ignore incomplete json chunks
      }
    }
  }

  return full;
}
