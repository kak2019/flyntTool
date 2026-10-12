import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "src/learn/k12-planning");

const REFERENCES = [
  "references/curriculum-grounding.md",
  "references/document-schema.md",
  "references/subject-chinese.md",
  "references/subject-mathematics.md",
  "references/subject-english.md",
  "references/subject-science.md",
  "references/subject-humanities.md",
  "references/subject-practice-arts.md",
];

let cached = "";

export function planningSystemPrompt() {
  if (cached) return cached;
  const body = [join(DIR, "SKILL.md"), ...REFERENCES.map((name) => join(DIR, name))]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n\n");
  cached = [
    "你是中国大陆中小学备课助手。严格遵守下面的技能说明和学科参考。",
    "用简体中文。公式使用 LaTeX：$...$ 行内，$$...$$ 独立成行。",
    "当前页面是普通对话：没有点击选项。不要自己运行脚本。",
    "需要补充信息时，一次只问一个问题，给出 A、B、C，推荐项放在 A。能从上下文推断的不要再问。",
    "信息够了就交付。代码块之前只用两三句话概括，不要把教案正文写在外面。",
    "然后只输出一个 ```lesson-json 代码块，内容是符合 document-schema 的完整 JSON。",
    "documents 至少包含 lesson_plan 和 observation_template；有学生纸面任务时再加 student_materials。",
    "学生材料里不要写答案和教学意图。没给教材页时，textbook 写明待教师核对，不要猜出版社。",
    "页面会在能生成 Word 时提供 Word 下载，否则提供 Markdown 下载。回复里不要提脚本或文件名。",
    "",
    body,
  ].join("\n");
  return cached;
}
