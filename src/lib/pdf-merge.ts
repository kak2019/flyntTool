import { PDFDocument } from "pdf-lib";

export const MAX_PDF_MERGE_FILES = 20;
export const MAX_PDF_MERGE_BYTES = 80 * 1024 * 1024;

function failName(name: string, err: unknown): Error {
  const message = err instanceof Error ? err.message : "";
  if (/encrypt/i.test(message)) return new Error(`${name} 有密码，打不开`);
  return new Error(`${name} 不是有效的 PDF`);
}

export async function countPdfPages(name: string, data: ArrayBuffer) {
  try {
    const doc = await PDFDocument.load(data);
    const pages = doc.getPageCount();
    if (!pages) throw new Error("empty");
    return pages;
  } catch (err) {
    if (err instanceof Error && err.message === "empty") {
      throw new Error(`${name} 没有页面`);
    }
    throw failName(name, err);
  }
}

export async function mergePdfBuffers(parts: { name: string; data: ArrayBuffer }[]) {
  if (parts.length < 2) throw new Error("至少选择两份 PDF");
  const out = await PDFDocument.create();
  for (const part of parts) {
    let src: PDFDocument;
    try {
      src = await PDFDocument.load(part.data);
    } catch (err) {
      throw failName(part.name, err);
    }
    const indices = src.getPageIndices();
    if (!indices.length) throw new Error(`${part.name} 没有页面`);
    const copied = await out.copyPages(src, indices);
    for (const page of copied) out.addPage(page);
  }
  const bytes = await out.save();
  return { bytes, pages: out.getPageCount() };
}

export function mergedPdfName(firstName: string) {
  const base = firstName.replace(/\.pdf$/i, "") || "merged";
  return `${base}-merged.pdf`;
}
