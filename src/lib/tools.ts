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
    id: "commit",
    name: "约定式提交",
    kicker: "Git",
    category: "dev",
    description: "把中文改动说明写成 feat/fix 那种英文提交信息。",
    href: "/tools/commit",
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
    id: "base64",
    name: "Base64",
    kicker: "编码",
    category: "dev",
    description: "文本和文件编解码，贴进去自动判断；图片能预览。",
    href: "/tools/base64",
  },
  {
    id: "hash",
    name: "Hash",
    kicker: "摘要",
    category: "dev",
    description: "MD5 / SHA-1 / SHA-256，文本和文件都算，结果可复制。",
    href: "/tools/hash",
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
    id: "mimo",
    name: "MiMo 问答",
    kicker: "对话",
    category: "info",
    description: "小米 MiMo 2.6 Flash 更省，也能换 Pro、智谱 GLM 或 Cloudflare 免费模型。都能联网，GLM 能看图。",
    href: "/tools/mimo",
  },
  {
    id: "md",
    name: "Markdown 预览",
    kicker: "文本",
    category: "info",
    description: "左边写，右边看。支持标题、列表、代码块和表格。",
    href: "/tools/md",
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
    id: "pdf-merge",
    name: "PDF 合并",
    kicker: "文档",
    category: "info",
    description: "按顺序把多份 PDF 的页面原样接成一个文件，在浏览器里完成。",
    href: "/tools/pdf-merge",
  },
  {
    id: "patent-fig",
    name: "专利附图嵌入",
    kicker: "文档",
    category: "info",
    description: "把附图标号、引线和圆圈合成进图片并改成嵌入型，「图 1」标题不进图。",
    href: "/tools/patent-fig",
  },
  {
    id: "company",
    name: "查公司",
    kicker: "企业",
    category: "info",
    description: "输入公司名，看工商、股东、主要人员、对外投资、公司发展，以及实控人、受益股东和股权穿透。",
    href: "/tools/company",
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
    id: "countdown",
    name: "倒计时",
    kicker: "时间",
    category: "life",
    description: "选定日期倒计时。按系统时钟计算，页面切到后台也会继续走。",
    href: "/tools/countdown",
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
  {
    id: "to-svg",
    name: "图片转 SVG",
    kicker: "图片",
    category: "life",
    description: "把 png / jpg 描成矢量 SVG，图标和扁平图效果最好。",
    href: "/tools/to-svg",
  },
  {
    id: "hotel",
    name: "酒店盯价",
    kicker: "出行",
    category: "life",
    description: "每小时看天津、云南和自己加的城市。低于 300 元用 Server酱 通知，相同的不发第二遍。",
    href: "/tools/hotel",
  },
  {
    id: "flight",
    name: "机票盯价",
    kicker: "出行",
    category: "life",
    description: "北京或天津到三亚，两位成人，盯重点日期和灵活日期的低价，用 Server酱提醒。",
    href: "/tools/flight",
  },
  {
    id: "shelf",
    name: "临时文件架",
    kicker: "文件",
    category: "life",
    description: "把文件放到 OSS 的 flyntpan，到期删除。分享链接不用登录。微信群码仍在 linchangweb。",
    href: "/tools/shelf",
  },
  {
    id: "wx-qr",
    name: "微信群码",
    kicker: "图片",
    category: "life",
    description: "上传最新微信群二维码，覆盖 OSS 上的固定图片，对外链接不变。",
    href: "/tools/wx-qr",
  },
  {
    id: "qr",
    name: "二维码",
    kicker: "图片",
    category: "life",
    description: "文本生成二维码，也能上传或粘贴图片识别。",
    href: "/tools/qr",
  },
];

export function getTool(id: string) {
  return tools.find((tool) => tool.id === id);
}

export function toolsIn(category: ToolCategoryId) {
  return tools.filter((tool) => tool.category === category);
}
