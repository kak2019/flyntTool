import ImageTracer from "@/lib/vendor/imagetracer";
import { imageToImageData, loadImageFile } from "@/lib/qr";

export const SVG_PRESETS = [
  { id: "icon", name: "图标", colors: 8, pathomit: 8 },
  { id: "flat", name: "扁平", colors: 16, pathomit: 8 },
  { id: "photo", name: "细致", colors: 32, pathomit: 4 },
  { id: "bw", name: "黑白", colors: 2, pathomit: 16 },
] as const;

export type SvgPresetId = (typeof SVG_PRESETS)[number]["id"];

export function isSvgFile(file: File) {
  return file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name);
}

export function isAiFile(file: File) {
  return file.type === "application/postscript" || /\.ai$/i.test(file.name);
}

export async function rasterToSvg(file: File, presetId: SvgPresetId): Promise<string> {
  if (isAiFile(file)) {
    throw new Error("浏览器里处理不了 Illustrator 的 .ai，请先导出成 png / jpg 再转。");
  }
  if (isSvgFile(file)) return file.text();
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
    throw new Error("请选 png / jpg / webp 图片。");
  }

  const preset = SVG_PRESETS.find((item) => item.id === presetId) ?? SVG_PRESETS[1];
  const img = await loadImageFile(file);
  const imageData = imageToImageData(img, presetId === "photo" ? 900 : 700);
  return ImageTracer.imagedataToSVG(imageData, {
    numberofcolors: preset.colors,
    pathomit: preset.pathomit,
    ltres: 1,
    qtres: 1,
    viewbox: true,
    desc: false,
    linefilter: true,
    rightangleenhance: true,
    colorsampling: 2,
  });
}

export function svgFileName(name: string) {
  return `${name.replace(/\.[^.]+$/, "") || "image"}.svg`;
}
