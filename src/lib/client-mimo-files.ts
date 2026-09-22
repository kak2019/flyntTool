import {
  MAX_MIMO_FILE_BYTES,
  MAX_MIMO_FILE_CHARS,
  MAX_MIMO_IMAGE_BYTES,
  MAX_MIMO_IMAGE_EDGE,
  MAX_MIMO_PDF_PAGES,
} from "@/lib/limits";
import { textContentToText } from "@/lib/pdf-text";
import type { MimoAttachment } from "@/lib/mimo";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp"]);
const TEXT_EXTS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "py",
  "go",
  "rs",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "rb",
  "php",
  "sh",
  "bash",
  "yml",
  "yaml",
  "toml",
  "ini",
  "log",
  "sql",
  "vue",
  "svelte",
  "kt",
  "swift",
  "r",
]);

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function nextId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
    reader.readAsText(file);
  });
}

function clipText(text: string) {
  const trimmed = text.replace(/\u0000/g, "").trim();
  if (trimmed.length <= MAX_MIMO_FILE_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_MIMO_FILE_CHARS)}\n…（已截断）`;
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = MAX_MIMO_IMAGE_EDGE;
      const scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error(`图片 ${file.name} 无法处理`));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`图片 ${file.name} 无法打开`));
    };
    img.src = url;
  });
}

async function readImage(file: File): Promise<MimoAttachment> {
  if (file.size > MAX_MIMO_IMAGE_BYTES) {
    throw new Error(`图片 ${file.name} 超过 ${MAX_MIMO_IMAGE_BYTES / 1024 / 1024}MB`);
  }
  const keepRaw =
    file.size <= 400_000 &&
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
  const dataUrl = keepRaw ? await readAsDataUrl(file) : await compressImage(file);
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error(`图片 ${file.name} 格式无法识别`);
  }
  return {
    id: nextId(),
    kind: "image",
    name: file.name || "图片",
    mime: file.type || "image/jpeg",
    dataUrl,
  };
}

async function readTextFile(file: File): Promise<MimoAttachment> {
  if (file.size > MAX_MIMO_FILE_BYTES) {
    throw new Error(`文件 ${file.name} 超过 ${MAX_MIMO_FILE_BYTES / 1024 / 1024}MB`);
  }
  const text = clipText(await readAsText(file));
  if (!text) throw new Error(`文件 ${file.name} 是空的`);
  return {
    id: nextId(),
    kind: "file",
    name: file.name || "文件",
    mime: file.type || "text/plain",
    text,
  };
}

async function readPdf(file: File): Promise<MimoAttachment> {
  if (file.size > MAX_MIMO_FILE_BYTES) {
    throw new Error(`PDF ${file.name} 超过 ${MAX_MIMO_FILE_BYTES / 1024 / 1024}MB`);
  }
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = Math.min(pdf.numPages, MAX_MIMO_PDF_PAGES);
  const chunks: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = textContentToText(content.items);
    if (text) chunks.push(text);
  }
      const extra = pdf.numPages > pages ? `\n…（仅提取前 ${pages} 页）` : "";
  const text = clipText(chunks.join("\n\n") + extra);
  if (!text) {
    throw new Error(`PDF ${file.name} 没有可提取文字，扫描件请改传图片`);
  }
  return {
    id: nextId(),
    kind: "file",
    name: file.name || "文档.pdf",
    mime: "application/pdf",
    text,
  };
}

export async function readMimoFile(file: File): Promise<MimoAttachment> {
  const ext = extOf(file.name);
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/") || IMAGE_EXTS.has(ext)) {
    if (mime === "image/svg+xml" || ext === "svg") {
      return readTextFile(file);
    }
    return readImage(file);
  }
  if (mime === "application/pdf" || ext === "pdf") return readPdf(file);
  if (mime.startsWith("text/") || mime === "application/json" || TEXT_EXTS.has(ext)) {
    return readTextFile(file);
  }
  throw new Error(`暂不支持 ${file.name}。请上传图片、PDF，或 txt/md/json 等文本文件。`);
}
