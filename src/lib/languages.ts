export const LANGUAGES = [
  { id: "Chinese", label: "中文" },
  { id: "English", label: "英语" },
  { id: "Japanese", label: "日语" },
  { id: "Korean", label: "韩语" },
  { id: "French", label: "法语" },
  { id: "German", label: "德语" },
  { id: "Spanish", label: "西班牙语" },
  { id: "Russian", label: "俄语" },
] as const;

export const SOURCE_LANGUAGES = [
  { id: "auto", label: "自动检测" },
  ...LANGUAGES,
];

export type LanguageId = (typeof LANGUAGES)[number]["id"];
