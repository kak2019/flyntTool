export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
  kicker: string;
};

export const tools: Tool[] = [
  {
    id: "rgb",
    name: "RGB / Hex",
    kicker: "颜色",
    description: "RGB 与十六进制互转，粘贴即识别，带色块预览。",
    href: "/tools/rgb",
  },
  {
    id: "translate",
    name: "快速翻译",
    kicker: "文本",
    description: "Qwen MT Flash，自动检测语言，默认译成英语。",
    href: "/tools/translate",
  },
  {
    id: "pdf",
    name: "PDF 对照翻译",
    kicker: "文档",
    description: "左边看原文 PDF，右边按页翻译。尽量保留换行；扫描件和手写会自动 OCR。",
    href: "/tools/pdf",
  },
];

export function getTool(id: string) {
  return tools.find((tool) => tool.id === id);
}
