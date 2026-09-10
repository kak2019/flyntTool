import jsQR from "jsqr";
import { toDataURL } from "qrcode";

export type QrLevel = "L" | "M" | "Q" | "H";

export async function generateQrDataUrl(
  text: string,
  opts?: { size?: number; level?: QrLevel },
): Promise<string> {
  const value = text.trim();
  if (!value) throw new Error("没有内容");
  return toDataURL(value, {
    errorCorrectionLevel: opts?.level ?? "M",
    margin: 2,
    width: opts?.size ?? 320,
    color: { dark: "#18181b", light: "#ffffff" },
  });
}

export function scanQrFromImageData(image: ImageData): string | null {
  const result = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

export function imageToImageData(img: HTMLImageElement, max = 1600): ImageData {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight, 1));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法读取图片");
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片打不开"));
    };
    img.src = url;
  });
}
