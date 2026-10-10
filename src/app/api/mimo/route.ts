import { NextRequest, NextResponse } from "next/server";
import {
  MAX_MIMO_ATTACHMENTS,
  MAX_MIMO_CHARS,
  MAX_MIMO_IMAGE_DATA,
  MAX_MIMO_MESSAGES,
} from "@/lib/limits";
import {
  isCloudflareModel,
  isMimoModel,
  isZhipuModel,
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
    : "mimo-v2.6-flash";
  if (isCloudflareModel(model)) {
    return cloudflareChat(req, messages, model, body.thinking === true, body.search !== false, body.stream !== false);
  }
  if (isZhipuModel(model)) {
    return zhipuChat(req, messages, model, body.thinking === true, body.search !== false, body.stream !== false);
  }

  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "未配置 MIMO_API_KEY" }, { status: 500 });
  }
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

function cloudflareSystemPrompt(searchNote?: string) {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date());
  const base = `You are a helpful assistant. Today is ${today}. Answer in the user's language unless they ask otherwise.`;
  return searchNote ? `${base}\n\n${searchNote}` : base;
}

type WebHit = { url: string; title: string; site?: string; content: string };

function searchQueryFrom(messages: MimoChatMessage[]) {
  const last = [...messages].reverse().find((item) => item.role === "user");
  return (last?.content ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}

async function zhipuWebSearch(query: string, signal: AbortSignal) {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) throw new Error("未配置 ZHIPU_API_KEY，无法联网搜索");
  const baseUrl = (process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/web_search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      search_engine: "search-prime",
      search_query: query,
      count: 5,
    }),
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(formatZhipuError(res.status, raw).replace("智谱接口失败", "智谱搜索失败"));
  }
  const data = (await res.json()) as {
    search_result?: { title?: string; link?: string; content?: string; media?: string }[];
  };
  const hits: WebHit[] = [];
  for (const item of data.search_result ?? []) {
    const url = String(item.link ?? "").trim();
    if (!url) continue;
    hits.push({
      url,
      title: String(item.title || url).trim().slice(0, 160),
      site: String(item.media ?? "").trim().slice(0, 80) || undefined,
      content: String(item.content ?? "").trim().slice(0, 500),
    });
  }
  return hits;
}

function searchNote(hits: WebHit[]) {
  if (!hits.length) {
    return "Web search returned no results. Say so if the question needs current facts, and do not invent sources.";
  }
  const lines = hits.map((hit, i) => {
    const site = hit.site ? `\n${hit.site}` : "";
    return `[${i + 1}] ${hit.title}${site}\n${hit.url}\n${hit.content}`;
  });
  return `Use these web search results when the question needs current facts. Cite the page title. Do not invent links.\n\n${lines.join("\n\n")}`;
}

function sourceEvent(hits: WebHit[]) {
  if (!hits.length) return "";
  return `data: ${JSON.stringify({
    annotations: hits.map((hit) => ({ url: hit.url, title: hit.title, site_name: hit.site ?? "" })),
  })}\n\n`;
}

async function gatherSearch(messages: MimoChatMessage[], search: boolean, signal: AbortSignal) {
  if (!search) return [] as WebHit[];
  const query = searchQueryFrom(messages);
  if (query.length < 2) return [];
  return zhipuWebSearch(query, signal);
}

function publicSources(hits: WebHit[]) {
  return hits.map((hit) => ({ url: hit.url, title: hit.title, site: hit.site }));
}

function formatCloudflareError(status: number, raw: string) {
  let detail = raw.slice(0, 280);
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string } | string;
      errors?: { message?: string }[];
    };
    if (typeof parsed.error === "string") detail = parsed.error;
    else if (parsed.error?.message) detail = parsed.error.message;
    else if (parsed.errors?.[0]?.message) detail = parsed.errors[0].message;
  } catch {
    // keep raw slice
  }
  if (/insufficient balance|add money|byok/i.test(detail)) {
    return "这个模型要另外付费，免费额度用不了。请换 Nemotron 120B。";
  }
  return `Cloudflare 接口失败（${status}）：${detail}`;
}

function rewriteCloudflareLine(line: string, thinking: boolean) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return line;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return line;
  try {
    const json = JSON.parse(payload) as {
      choices?: { delta?: { reasoning?: string; reasoning_content?: string }; message?: { reasoning?: string; reasoning_content?: string } }[];
    };
    const choice = json.choices?.[0];
    for (const holder of [choice?.delta, choice?.message]) {
      if (!holder) continue;
      if (typeof holder.reasoning === "string") {
        if (thinking) holder.reasoning_content = holder.reasoning;
        delete holder.reasoning;
      }
      if (!thinking) delete holder.reasoning_content;
    }
    return `data: ${JSON.stringify(json)}`;
  } catch {
    return line;
  }
}

async function cloudflareChat(
  req: NextRequest,
  messages: MimoChatMessage[],
  model: string,
  thinking: boolean,
  search: boolean,
  stream: boolean,
) {
  if (messages.some((item) => item.attachments?.some((att) => att.kind === "image"))) {
    return NextResponse.json(
      { error: "Nemotron 不能看图片。请换回 MiMo，或去掉图片再发。" },
      { status: 400 },
    );
  }
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    return NextResponse.json({ error: "未配置 Cloudflare Workers AI" }, { status: 500 });
  }
  let hits: WebHit[] = [];
  try {
    hits = await gatherSearch(messages, search, req.signal);
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    const message = err instanceof Error ? err.message : "联网搜索失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const upstreamMessages = toMimoUpstreamMessages(messages).map((item) => ({
    role: item.role,
    content:
      typeof item.content === "string"
        ? item.content
        : item.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n\n"),
  }));
  const payload = {
    model,
    stream,
    max_tokens: 4096,
    messages: [{ role: "system", content: cloudflareSystemPrompt(search ? searchNote(hits) : undefined) }, ...upstreamMessages],
  };
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;

  if (!stream) {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: req.signal,
      body: JSON.stringify(payload),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: formatCloudflareError(upstream.status, await upstream.text()) },
        { status: 502 },
      );
    }
    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string; reasoning?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const message = data.choices?.[0]?.message;
    return NextResponse.json({
      text: message?.content ?? "",
      reasoning: thinking ? (message?.reasoning ?? "") : "",
      sources: publicSources(hits),
      usage: data.usage ?? null,
    });
  }

  const encoder = new TextEncoder();
  const out = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      send(": waiting\n\n");
      send(sourceEvent(hits));
      const ping = setInterval(() => {
        try {
          send(": ping\n\n");
        } catch {
          clearInterval(ping);
        }
      }, 3000);
      try {
        const upstream = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          signal: req.signal,
          body: JSON.stringify(payload),
        });
        if (!upstream.ok) {
          send(`data: ${JSON.stringify({ error: formatCloudflareError(upstream.status, await upstream.text()) })}\n\n`);
          return;
        }
        const reader = upstream.body?.getReader();
        if (!reader) {
          send(`data: ${JSON.stringify({ error: "Cloudflare 没有返回内容" })}\n\n`);
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value ?? new Uint8Array(), { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const next = rewriteCloudflareLine(line, thinking);
            if (next) send(`${next}\n`);
          }
        }
        if (buffer.trim()) send(`${rewriteCloudflareLine(buffer, thinking)}\n`);
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

function formatZhipuError(status: number, raw: string) {
  let detail = raw.slice(0, 280);
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } | string };
    if (typeof parsed.error === "string") detail = parsed.error;
    else if (parsed.error?.message) detail = parsed.error.message;
  } catch {
    // keep raw slice
  }
  return `智谱接口失败（${status}）：${detail}`;
}

async function zhipuChat(
  req: NextRequest,
  messages: MimoChatMessage[],
  model: string,
  thinking: boolean,
  search: boolean,
  stream: boolean,
) {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "未配置 ZHIPU_API_KEY" }, { status: 500 });
  }
  let hits: WebHit[] = [];
  try {
    hits = await gatherSearch(messages, search, req.signal);
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    const message = err instanceof Error ? err.message : "联网搜索失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  const baseUrl = (process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, "");
  const payload = {
    model,
    stream,
    stream_options: stream ? { include_usage: true } : undefined,
    temperature: 1,
    top_p: 0.95,
    max_tokens: 4096,
    thinking: { type: "enabled", clear_thinking: false },
    messages: [
      { role: "system", content: cloudflareSystemPrompt(search ? searchNote(hits) : undefined) },
      ...toMimoUpstreamMessages(messages),
    ],
  };
  const url = `${baseUrl}/chat/completions`;

  if (!stream) {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: req.signal,
      body: JSON.stringify(payload),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: formatZhipuError(upstream.status, await upstream.text()) },
        { status: 502 },
      );
    }
    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const message = data.choices?.[0]?.message;
    return NextResponse.json({
      text: message?.content ?? "",
      reasoning: thinking ? (message?.reasoning_content ?? "") : "",
      sources: publicSources(hits),
      usage: data.usage ?? null,
    });
  }

  const encoder = new TextEncoder();
  const out = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      send(": waiting\n\n");
      send(sourceEvent(hits));
      const ping = setInterval(() => {
        try {
          send(": ping\n\n");
        } catch {
          clearInterval(ping);
        }
      }, 3000);
      try {
        const upstream = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          signal: req.signal,
          body: JSON.stringify(payload),
        });
        if (!upstream.ok) {
          send(`data: ${JSON.stringify({ error: formatZhipuError(upstream.status, await upstream.text()) })}\n\n`);
          return;
        }
        const reader = upstream.body?.getReader();
        if (!reader) {
          send(`data: ${JSON.stringify({ error: "智谱没有返回内容" })}\n\n`);
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value ?? new Uint8Array(), { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const next = rewriteCloudflareLine(line, thinking);
            if (next) send(`${next}\n`);
          }
        }
        if (buffer.trim()) send(`${rewriteCloudflareLine(buffer, thinking)}\n`);
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
