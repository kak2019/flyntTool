export type ToolCategoryId = "dev" | "info" | "life";

export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
  kicker: string;
  category: ToolCategoryId;
};

export const toolCategories: { id: ToolCategoryId; name: string }[] = [
  { id: "dev", name: "开发" },
  { id: "info", name: "信息" },
  { id: "life", name: "生活" },
];

export const tools: Tool[] = [
  {
    id: "rgb",
    name: "RGB / Hex",
    kicker: "颜色",
    category: "dev",
    description: "RGB 与十六进制互转，粘贴即识别，带色块预览。",
    href: "/tools/rgb",
  },
  {
    id: "json",
    name: "JSON 格式化",
    kicker: "数据",
    category: "dev",
    description: "校验、美化、压缩 JSON，复制结果。",
    href: "/tools/json",
  },
  {
    id: "url",
    name: "URL / Query",
    kicker: "链接",
    category: "dev",
    description: "拆开 URL 和查询参数，改完再拼回去。",
    href: "/tools/url",
  },
  {
    id: "time",
    name: "时间戳",
    kicker: "时间",
    category: "dev",
    description: "Unix 时间戳与日期互转，本地 / UTC / ISO。",
    href: "/tools/time",
  },
  {
    id: "diff",
    name: "文本 Diff",
    kicker: "对比",
    category: "dev",
    description: "两段文本逐行或逐词对比，看出增删。",
    href: "/tools/diff",
  },
  {
    id: "regex",
    name: "正则测试",
    kicker: "匹配",
    category: "dev",
    description: "贴表达式和样例，高亮匹配，看分组和替换。",
    href: "/tools/regex",
  },
  {
    id: "id",
    name: "UUID / NanoID",
    kicker: "标识",
    category: "dev",
    description: "批量生成 UUID v4 或 NanoID，也能识别贴进来的值。",
    href: "/tools/id",
  },
  {
    id: "translate",
    name: "快速翻译",
    kicker: "文本",
    category: "info",
    description: "Qwen MT Flash，自动检测语言，默认译成英语。",
    href: "/tools/translate",
  },
  {
    id: "pdf",
    name: "PDF 对照翻译",
    kicker: "文档",
    category: "info",
    description: "左边看原文 PDF，右边按页翻译。尽量保留换行；扫描件和手写会自动 OCR。",
    href: "/tools/pdf",
  },
  {
    id: "patent-fig",
    name: "专利附图嵌入",
    kicker: "文档",
    category: "info",
    description: "把附图标号和引线合成进图片并改成嵌入型，「图 1」标题不进图。",
    href: "/tools/patent-fig",
  },
  {
    id: "news",
    name: "新闻聚合",
    kicker: "资讯",
    category: "info",
    description: "金十快讯优先，外加科技 / 社区 / 前端 RSS。点开去原站。",
    href: "/tools/news",
  },
  {
    id: "fi",
    name: "财务自由",
    kicker: "人生",
    category: "life",
    description: "攒钱、复利、目标金额；下面用嵌套格子看剩余寿命、周末和睡眠。",
    href: "/tools/fi",
  },
  {
    id: "cutout",
    name: "抠图去背景",
    kicker: "图片",
    category: "life",
    description: "上传或粘贴照片，扣成透明底 PNG，可预览、下载。",
    href: "/tools/cutout",
  },
];

export function getTool(id: string) {
  return tools.find((tool) => tool.id === id);
}

export function toolsIn(category: ToolCategoryId) {
  return tools.filter((tool) => tool.category === category);
}
