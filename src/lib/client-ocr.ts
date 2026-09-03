export async function ocrImage(image: string): Promise<string> {
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `识别失败（${res.status}）`);
  }
  return (data.text ?? "").trim();
}

export async function canvasToJpeg(
  source: HTMLCanvasElement,
  maxEdge = 1600,
): Promise<string> {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height, 1));
  if (scale === 1) {
    return source.toDataURL("image/jpeg", 0.82);
  }
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(source.width * scale));
  out.height = Math.max(1, Math.round(source.height * scale));
  const ctx = out.getContext("2d");
  if (!ctx) return source.toDataURL("image/jpeg", 0.82);
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.82);
}
