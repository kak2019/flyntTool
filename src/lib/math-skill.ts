import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  "SKILL.md",
  "curriculum_map.md",
  "knowledge_points.md",
  "question_templates.md",
  "grading_rubric.md",
];

let cached = "";

export function mathSystemPrompt() {
  if (cached) return cached;
  const dir = join(process.cwd(), "src/learn/math");
  const body = FILES.map((name) => readFileSync(join(dir, name), "utf8")).join("\n\n");
  cached = [
    "你是数学教材同步教育助手。严格遵守下面的技能说明和参考资料。",
    "用简体中文回答。数学公式使用 LaTeX：$...$ 行内，$$...$$ 独立成行。",
    "只讲当前学段已经学过的内容，不超纲。",
    "",
    body,
  ].join("\n");
  return cached;
}
