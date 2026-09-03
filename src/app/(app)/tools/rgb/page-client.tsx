"use client";

import { useMemo, useState } from "react";
import { clampByte, parseColor, rgbToHex } from "@/lib/color";
import { btnClass, fieldClass } from "@/lib/styles";

export default function RgbPage() {
  const [r, setR] = useState(15);
  const [g, setG] = useState(118);
  const [b, setB] = useState(110);
  const [hexInput, setHexInput] = useState("#0F766E");
  const [paste, setPaste] = useState("");
  const [copied, setCopied] = useState("");

  const hex = rgbToHex(r, g, b);

  function applyRgb(nr: number, ng: number, nb: number) {
    const next = {
      r: clampByte(nr),
      g: clampByte(ng),
      b: clampByte(nb),
    };
    setR(next.r);
    setG(next.g);
    setB(next.b);
    setHexInput(rgbToHex(next.r, next.g, next.b));
  }

  function onHexChange(value: string) {
    setHexInput(value);
    const parsed = parseColor(value);
    if (parsed) {
      setR(parsed.r);
      setG(parsed.g);
      setB(parsed.b);
    }
  }

  function onPaste(value: string) {
    setPaste(value);
    const parsed = parseColor(value);
    if (parsed) applyRgb(parsed.r, parsed.g, parsed.b);
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1200);
  }

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      onPaste(text.trim());
    } catch {
      setCopied("");
    }
  }

  const rgbCss = useMemo(() => `rgb(${r}, ${g}, ${b})`, [r, g, b]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">RGB / Hex</h1>
      <p className="mt-1 text-sm text-zinc-500">
        粘贴、滑杆、取色器都会同步。支持 <code>#0F766E</code>、
        <code>rgb(15, 118, 110)</code>、<code>15, 118, 110</code>。
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <div
            className="h-52 rounded-2xl border border-zinc-200 shadow-inner"
            style={{ background: hex }}
          />
          <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm">
            取色器
            <input
              type="color"
              value={hex.toLowerCase()}
              onChange={(e) => {
                const parsed = parseColor(e.target.value);
                if (parsed) applyRgb(parsed.r, parsed.g, parsed.b);
              }}
              className="h-8 w-16 cursor-pointer rounded border-0 bg-transparent"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium">
            随便粘贴
            <div className="mt-1.5 flex gap-2">
              <input
                value={paste}
                onChange={(e) => onPaste(e.target.value)}
                placeholder="#0F766E 或 15, 118, 110"
                className={fieldClass}
              />
              <button type="button" onClick={() => void pasteClipboard()} className={btnClass}>
                剪贴板
              </button>
            </div>
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Hex
              <div className="mt-1.5 flex gap-2">
                <input
                  value={hexInput}
                  onChange={(e) => onHexChange(e.target.value)}
                  className={`${fieldClass} font-mono`}
                />
                <button type="button" onClick={() => void copy("hex", hex)} className={btnClass}>
                  复制
                </button>
              </div>
            </label>
            <label className="block text-sm font-medium">
              CSS
              <div className="mt-1.5 flex gap-2">
                <input
                  readOnly
                  value={rgbCss}
                  className={`${fieldClass} bg-zinc-50 font-mono`}
                />
                <button type="button" onClick={() => void copy("rgb", rgbCss)} className={btnClass}>
                  复制
                </button>
              </div>
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <Channel label="R" value={r} onChange={(v) => applyRgb(v, g, b)} accent="#ef4444" />
            <Channel label="G" value={g} onChange={(v) => applyRgb(r, v, b)} accent="#22c55e" />
            <Channel label="B" value={b} onChange={(v) => applyRgb(r, g, v)} accent="#3b82f6" />
          </div>

          {copied ? (
            <p className="mt-3 text-sm text-teal-700">已复制 {copied}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Channel({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-4 font-medium">{label}</span>
      <input
        type="range"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full"
        style={{ accentColor: accent }}
      />
      <input
        type="number"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded-lg border border-zinc-200 px-2 py-1 font-mono text-sm outline-none focus:border-teal-700"
      />
    </label>
  );
}
