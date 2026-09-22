import { NextRequest, NextResponse } from "next/server";
import {
  MAX_MIMO_ATTACHMENTS,
  MAX_MIMO_CHARS,
  MAX_MIMO_IMAGE_DATA,
  MAX_MIMO_MESSAGES,
} from "@/lib/limits";
import {
  isMimoModel,
  normalizeMimoAttachments,
  toMimoUpstreamMessages,
  type MimoChatMessage,
} from "@/lib/mimo";

const WINDOW_MS = 60_000;
const MAX_HITS = 30;
const hits = new Map<string, { n: number; t: number }>();

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function rateLimited(ip: string) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_HITS;
}

function systemPrompt() {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date());
  return `You are MiMo, an AI assistant developed by Xiaomi. Today is ${today}. Answer in the user's language unless they ask otherwise. Use web search when the question needs current facts, news, weather, prices, or anything after your knowledge cutoff.`;
}

function formatUpstreamError(status: number, raw: string) {
  let detail = raw.slice(0, 280);
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; code?: string } | string };
    if (typeof parsed.error === "string") detail = parsed.error;
    else if (parsed.error?.message) detail = parsed.error.message;
  } catch {
    // keep raw slice
  }
  if (status === 429 || /rate|limit|concurren|配额|限流|并发/i.test(detail)) {
    return `小米接口并发或频率满了：${detail}`;
  }
  return `MiMo 接口失败（${status}）：${detail}`;
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "请求太频繁，稍等再试" }, { status: 429 });
  }

  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "未配置 MIMO_API_KEY" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    messages?: MimoChatMessage[];
    model?: string;
    thinking?: boolean;
    search?: boolean;
    stream?: boolean;
  };

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages = raw
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({
      role: item.role,
      content: String(item.content ?? "").trim(),
      reasoning: String(item.reasoning ?? "").trim(),
      attachments: normalizeMimoAttachments(
        item.attachments,
        MAX_MIMO_ATTACHMENTS,
        MAX_MIMO_IMAGE_DATA,
      ),
    }))
    .filter((item) => item.content || item.attachments.length)
    .slice(-MAX_MIMO_MESSAGES);

  if (messages.length === 0) {
    return NextResponse.json({ error: "请先输入问题，或上传图片/文件" }, { status: 400 });
  }
  if (messages.some((item) => item.content.length > MAX_MIMO_CHARS)) {
    return NextResponse.json(
      { error: `单条最多 ${MAX_MIMO_CHARS} 字，请缩短后再发` },
      { status: 400 },
    );
  }

  const model = isMimoModel(String(body.model ?? ""))
    ? String(body.model)
    : "mimo-v2.6-pro-ultraspeed";
  const thinking = body.thinking === true;
  const search = body.search !== false;
  const stream = body.stream !== false;
  const baseUrl = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
  const payload = {
    model,
    stream,
    stream_options: stream ? { include_usage: true } : undefined,
    max_completion_tokens: thinking ? 16384 : 8192,
    thinking: { type: thinking ? "enabled" : "disabled" },
    tool_choice: search ? "auto" : undefined,
    tools: search
      ? [
          {
            type: "web_search",
            max_keyword: 3,
            force_search: true,
            limit: 3,
            user_location: { type: "approximate", country: "China" },
          },
        ]
      : undefined,
    messages: [{ role: "system", content: systemPrompt() }, ...toMimoUpstreamMessages(messages)],
  };

  if (!stream) {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      signal: req.signal,
      body: JSON.stringify(payload),
    });
    if (!upstream.ok) {
      const err = await upstream.text();
      return NextResponse.json({ error: formatUpstreamError(upstream.status, err) }, { status: 502 });
    }
    const data = (await upstream.json()) as {
      choices?: {
        message?: {
          content?: string;
          reasoning_content?: string;
          annotations?: { url?: string; title?: string; site_name?: string }[];
        };
      }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        completion_tokens_details?: { reasoning_tokens?: number };
        web_search_usage?: { tool_usage?: number };
      };
    };
    const notes = data.choices?.[0]?.message?.annotations ?? [];
    return NextResponse.json({
      text: data.choices?.[0]?.message?.content ?? "",
      reasoning: data.choices?.[0]?.message?.reasoning_content ?? "",
      sources: notes
        .filter((item) => item.url)
        .map((item) => ({
          url: item.url,
          title: item.title || item.site_name || item.url,
          site: item.site_name,
        })),
      usage: data.usage ?? null,
    });
  }

  const encoder = new TextEncoder();
  const out = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      send(": waiting\n\n");
      const ping = setInterval(() => {
        try {
          send(": ping\n\n");
        } catch {
          clearInterval(ping);
        }
      }, 3000);

      try {
        const upstream = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "api-key": apiKey,
            "Content-Type": "application/json",
          },
          signal: req.signal,
          body: JSON.stringify(payload),
        });

        if (!upstream.ok) {
          const err = await upstream.text();
          send(`data: ${JSON.stringify({ error: formatUpstreamError(upstream.status, err) })}\n\n`);
          return;
        }

        const reader = upstream.body?.getReader();
        if (!reader) {
          send(`data: ${JSON.stringify({ error: "小米接口没有返回内容" })}\n\n`);
          return;
        }
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
      } catch (err) {
        if (req.signal.aborted) return;
        const message = err instanceof Error ? err.message : "上游请求失败";
        send(`data: ${JSON.stringify({ error: message })}\n\n`);
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(out, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
