"use client";

import { useEffect, useMemo, useState } from "react";
import { extractBuildScript } from "@/learn/anatomy/script";
import { chatMimo } from "@/lib/client-mimo";
import { addMimoUsage, emptyMimoUsage, type MimoChatMessage, type MimoModelId, type MimoUsage } from "@/lib/mimo";
import { btnClass, fieldClass, primaryBtnClass, selectClass } from "@/lib/styles";

const MODELS: { id: MimoModelId; label: string }[] = [
  { id: "mimo-v2.6-flash", label: "MiMo 2.6 Flash" },
  { id: "mimo-v2.6-pro", label: "MiMo 2.6 Pro" },
];

const SAMPLES = [
  "令牌桶限流：水从旋钮流入桶，桶满后从溢流口流出，阀门按固定速率放水。",
  "弹子锁：钥匙齿把每根弹子顶到剪切线，锁芯才能转动。",
  "本生灯：打开空气环，懒洋洋的黄火焰变成蓝焰锥。火焰用 WebGL。",
];

type Built = { ok: boolean; html: string; log: string; audit: "passed" | "failed" | "skipped" };

const STEPS = [
  { title: "模型写构建脚本", hint: "这一步最久" },
  { title: "本地构建并审计", hint: "通常不到半分钟" },
  { title: "按报错再写一版", hint: "只有没通过才有" },
  { title: "重新构建并审计", hint: "通常不到半分钟" },
];

function budgets(model: MimoModelId) {
  const write = model === "mimo-v2.6-pro" ? 120 : 70;
  return [write, 25, write, 25];
}

function clock(seconds: number) {
  const safe = Math.max(0, seconds);
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  if (min <= 0) return `${sec} 秒`;
  return `${min} 分 ${sec.toString().padStart(2, "0")} 秒`;
}

function extractHtml(text: string) {
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const lower = body.toLowerCase();
  const start = lower.indexOf("<!doctype");
  const htmlAt = lower.indexOf("<html");
  const from = start >= 0 ? start : htmlAt;
  if (from < 0) return "";
  const end = lower.lastIndexOf("</html>");
  return body.slice(from, end >= 0 ? end + 7 : undefined).trim();
}

async function buildScript(script: string) {
  const res = await fetch("/api/anatomy/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<Built> & { error?: string };
  if (!res.ok) throw new Error(data.error || "构建请求失败");
  return {
    ok: Boolean(data.ok),
    html: data.html ?? "",
    log: data.log ?? "",
    audit: data.audit ?? "skipped",
  } satisfies Built;
}

export default function AnatomyPage() {
  const [prompt, setPrompt] = useState(SAMPLES[0]);
  const [model, setModel] = useState<MimoModelId>("mimo-v2.6-flash");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [stepAt, setStepAt] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [raw, setRaw] = useState("");
  const [script, setScript] = useState("");
  const [log, setLog] = useState("");
  const [audit, setAudit] = useState<Built["audit"] | "">("");
  const [html, setHtml] = useState("");
  const [usage, setUsage] = useState<MimoUsage | null>(null);
  const [liveUsage, setLiveUsage] = useState<MimoUsage | null>(null);
  const modelLabel = MODELS.find((item) => item.id === model)?.label ?? model;
  const preview = useMemo(() => html, [html]);
  const stepBudget = budgets(model)[step] ?? 0;
  const stepSpent = stepAt ? Math.floor((now - stepAt) / 1000) : 0;
  const stepLeft = Math.max(0, stepBudget - stepSpent);
  const totalSpent = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const shownUsage = liveUsage && usage ? addMimoUsage(usage, liveUsage) : (liveUsage ?? usage);

  function tokenLine(item: MimoUsage) {
    const bits = [`输入 ${item.prompt.toLocaleString("zh-CN")}`, `输出 ${item.completion.toLocaleString("zh-CN")}`];
    if (item.reasoning) bits.push(`思考 ${item.reasoning.toLocaleString("zh-CN")}`);
    return `${item.total.toLocaleString("zh-CN")}（${bits.join(" · ")}）`;
  }

  useEffect(() => {
    if (!busy) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [busy]);

  function goStep(next: number) {
    const at = Date.now();
    setStep(next);
    setStepAt(at);
    setNow(at);
  }

  async function ask(messages: MimoChatMessage[]) {
    const result = await chatMimo({
      endpoint: "/api/anatomy",
      model,
      search: false,
      messages,
      signal: AbortSignal.timeout(150_000),
      onDelta: (state) => {
        setRaw(state.content);
        if (state.usage) setLiveUsage(state.usage);
      },
    });
    if (result.usage) setUsage((cur) => addMimoUsage(cur ?? emptyMimoUsage(), result.usage!));
    setLiveUsage(null);
    return result;
  }

  async function draw() {
    const text = prompt.trim();
    if (!text || busy) return;
    const at = Date.now();
    setBusy(true);
    setError("");
    setRaw("");
    setScript("");
    setLog("");
    setAudit("");
    setHtml("");
    setUsage(null);
    setLiveUsage(null);
    setStartedAt(at);
    setStepAt(at);
    setNow(at);
    setStep(0);
    try {
      const first = await ask([{ role: "user", content: text }]);
      let source = extractBuildScript(first.content);
      if (!source) {
        const page = extractHtml(first.content);
        if (page) {
          setHtml(page);
          setError("这次没有交出 kit 构建脚本，先按页面预览。");
        } else {
          setError("没有返回 build.mjs。可以换 Pro，或把题目说得更具体。");
        }
        return;
      }
      setScript(source);
      goStep(1);
      let built = await buildScript(source);
      setLog(built.log);
      setAudit(built.audit);
      if (built.html) setHtml(built.html);
      if (!built.ok) {
        goStep(2);
        const second = await ask([
          { role: "user", content: text },
          { role: "assistant", content: first.content },
          {
            role: "user",
            content: `构建或审计没有通过。请只输出修正后的完整 build.mjs。\n若报错与 iso / fitProjection / not iterable 有关：fitProjection 的 points 必须是 [x,y,z] 数组，请改成 [...k.boxCorners(plan, z0, z1), ...]，不要传对象或零件列表。\n\n${built.log.slice(-4000)}`,
          },
        ]);
        const next = extractBuildScript(second.content);
        if (next) {
          source = next;
          setScript(source);
          goStep(3);
          built = await buildScript(source);
          setLog(built.log);
          setAudit(built.audit);
          if (built.html) setHtml(built.html);
        }
      }
      if (!built.html) setError("没有生成 figure.html。日志在下面。");
      else if (built.audit === "failed") setError("页面已经生成，审计还没通过。");
      else if (!built.ok) setError("构建有报错。能打开的预览先留着，日志在下面。");
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      setError(timedOut ? "超过 2 分半还没写完，已停止。请再点一次开始画，或把题目说短一点。" : err instanceof Error ? err.message : "生成失败");
    } finally {
      setBusy(false);
      setStep(-1);
    }
  }

  function download(contents: string, name: string, type: string) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-teal-700">图解</p>
        <h1 className="text-2xl font-semibold">解剖图</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          按{" "}
          <a className="text-teal-800 underline" href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noreferrer">
            Anatomy
          </a>{" "}
          的 kit 写构建脚本，在本地跑出页面。火焰和水会进 WebGL 层，零件形状会走 audit.mjs。默认 MiMo Flash，可换 Pro。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((sample) => (
          <button key={sample} type="button" className={btnClass} disabled={busy} onClick={() => setPrompt(sample)}>
            {sample.slice(0, 12)}…
          </button>
        ))}
      </div>
      <label className="block text-sm">
        要解释的机制
        <textarea
          className={`${fieldClass} mt-1 min-h-28`}
          value={prompt}
          maxLength={4000}
          disabled={busy}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-zinc-500">
          模型
          <select
            className={`${selectClass} ml-2`}
            value={model}
            disabled={busy}
            onChange={(event) => setModel(event.target.value as MimoModelId)}
          >
            {MODELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={btnClass} disabled={!html} onClick={() => download(html, "anatomy.html", "text/html;charset=utf-8")}>
          下载 HTML
        </button>
        <button type="button" className={btnClass} disabled={!script} onClick={() => download(script, "build.mjs", "text/javascript;charset=utf-8")}>
          下载脚本
        </button>
        {audit ? <span className="text-sm text-zinc-500">审计：{audit === "passed" ? "通过" : audit === "failed" ? "未通过" : "未跑完"}</span> : null}
      </div>
      <button
        type="button"
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-base font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        disabled={busy || !prompt.trim()}
        onClick={() => void draw()}
      >
        {busy ? "正在生成…" : `开始画 · ${modelLabel}`}
      </button>
      {busy ? (
        <section className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="font-medium">{STEPS[step]?.title ?? "正在生成"}</p>
            <p className="text-sm text-zinc-600">已用 {clock(totalSpent)}</p>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {stepLeft > 0
              ? `这一步大约还要 ${clock(stepLeft)}。${model === "mimo-v2.6-pro" ? "Pro 比 Flash 慢。" : "Flash 写脚本大约 1 到 2 分钟。"}`
              : "这一步比预计久。字数还在增加，就说明模型还在写，没有卡住。"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            已收到 {raw.length.toLocaleString("zh-CN")} 字
            {shownUsage ? ` · 已用 token ${tokenLine(shownUsage)}` : " · token 要等这一轮模型返回后才有数"}
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-4">
            {STEPS.map((item, index) => (
              <li key={item.title} className={`rounded-xl px-3 py-2 text-sm ${index === step ? "bg-white font-medium text-teal-900" : index < step ? "text-teal-800" : "text-zinc-400"}`}>
                <span className="block">{index < step ? "已完成" : index === step ? "进行中" : "还没到"}</span>
                {item.title}
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">{item.hint}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {!busy && shownUsage ? <p className="text-sm text-zinc-600">这次消耗 token {tokenLine(shownUsage)}。改了一版的话，两轮加在一起。</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {preview ? (
        <iframe title="解剖图预览" sandbox="allow-scripts" srcDoc={preview} className="h-[640px] w-full rounded-2xl border border-zinc-200 bg-white" />
      ) : (
        <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-zinc-200 px-6 text-center text-sm leading-6 text-zinc-400">
          {busy
            ? "图要等构建结束才出现。上面的步骤和倒计时就是进度。"
            : "点上面的「开始画」。Flash 大约 1 分钟出图；超过 2 分半会自动停下。审计不过会再写一版。Pro 更慢一些。"}
        </div>
      )}
      {log ? (
        <details className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium">构建和审计日志</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-zinc-600">{log}</pre>
        </details>
      ) : null}
    </div>
  );
}
