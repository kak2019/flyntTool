import { readFileSync, cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const source = readFileSync("src/learn/anatomy/prompt.ts", "utf8");
const sys = source.slice(source.indexOf("return `") + 8, source.lastIndexOf("`;"));
const key = env.MIMO_API_KEY;
const base = (env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
const started = Date.now();
const res = await fetch(`${base}/chat/completions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "api-key": key, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "mimo-v2.6-flash",
    stream: false,
    max_completion_tokens: 8192,
    thinking: { type: "disabled" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: "令牌桶限流：水从旋钮流入桶，桶满后从溢流口流出，阀门按固定速率放水。" },
    ],
  }),
});
const data = await res.json();
const text = data.choices?.[0]?.message?.content ?? "";
const fence = text.match(/```(?:javascript|js|mjs)?\s*([\s\S]*?)```/i);
const script = (fence ? fence[1] : text).trim();
console.log("status", res.status, "ms", Date.now() - started, "chars", text.length, "finish", data.choices?.[0]?.finish_reason);
console.log("has figure", script.includes("figure.html"), "has pageHtml", script.includes("pageHtml"));
if (!script.includes("figure.html")) {
  console.log(text.slice(0, 400));
  process.exit(1);
}
const dir = mkdtempSync(join(tmpdir(), "anatomy-probe-"));
cpSync("src/learn/anatomy/kit", join(dir, "kit"), { recursive: true });
writeFileSync(
  join(dir, "inline-kit.mjs"),
  `import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const KIT = join(dirname(fileURLToPath(import.meta.url)), "kit");
const strip = (file) => readFileSync(join(KIT, file), "utf8").replace(/^export /gm, "");
export function kitScript() { return strip("iso-kit.mjs"); }
export function glScript() { return strip("gl.mjs"); }
`,
);
writeFileSync(join(dir, "build.mjs"), script);
const child = spawn(process.execPath, ["build.mjs", "--light", "--audit"], { cwd: dir, windowsHide: true });
let log = "";
child.stdout.on("data", (chunk) => (log += chunk));
child.stderr.on("data", (chunk) => (log += chunk));
child.on("close", (code) => {
  console.log("exit", code);
  console.log(log.slice(-1000));
  process.exit(code === 0 ? 0 : 1);
});
