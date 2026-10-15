import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractBuildScript } from "@/learn/anatomy/script";

export { extractBuildScript };

const KIT = join(process.cwd(), "src/learn/anatomy/kit");
const MAX_HTML = 2_000_000;
const MAX_LOG = 12_000;

const BANNED = [
  /child_process/,
  /process\.env/,
  /node:net/,
  /node:http/,
  /node:https/,
  /from\s+["']https?:/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
];

const INLINE_KIT = `import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "kit");
const strip = (file) => readFileSync(join(KIT, file), "utf8").replace(/^export /gm, "");

export function kitScript() {
  return strip("iso-kit.mjs");
}

export function glScript() {
  return strip("gl.mjs");
}
`;

export type BuildResult = {
  ok: boolean;
  html: string;
  log: string;
  audit: "passed" | "failed" | "skipped";
};

export function scriptProblem(code: string) {
  if (!code.trim()) return "没有找到 build.mjs。请只输出一个 javascript 代码块。";
  for (const rule of BANNED) {
    if (rule.test(code)) return "脚本里不能访问网络、环境变量或子进程。";
  }
  if (!code.includes("auditOrExit")) return "脚本需要调用 audit.mjs 的 auditOrExit。";
  return "";
}

export async function runAnatomyBuild(code: string): Promise<BuildResult> {
  const problem = scriptProblem(code);
  if (problem) return { ok: false, html: "", log: problem, audit: "skipped" };

  const dir = await mkdtemp(join(tmpdir(), "flynt-anatomy-"));
  try {
    await cp(KIT, join(dir, "kit"), { recursive: true });
    await writeFile(join(dir, "inline-kit.mjs"), INLINE_KIT, "utf8");
    await writeFile(join(dir, "build.mjs"), code, "utf8");
    const log = await runNode(dir);
    let html = "";
    try {
      html = await readFile(join(dir, "figure.html"), "utf8");
    } catch {
      html = "";
    }
    if (html.length > MAX_HTML) html = html.slice(0, MAX_HTML);
    const audit = /audit passed/.test(log) ? "passed" : /audit failed/.test(log) ? "failed" : "skipped";
    const ok = Boolean(html) && audit !== "failed" && !/Error:|SyntaxError|ReferenceError|TypeError/.test(log);
    return { ok, html, log: log.slice(-MAX_LOG), audit };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runNode(cwd: string) {
  return new Promise<string>((resolve) => {
    const child = spawn(process.execPath, ["build.mjs", "--light", "--audit"], {
      cwd,
      windowsHide: true,
      env: {
        PATH: process.env.PATH ?? "",
        PATHEXT: process.env.PATHEXT ?? "",
        SystemRoot: process.env.SystemRoot ?? "",
        NODE_ENV: process.env.NODE_ENV ?? "production",
      },
    });
    let log = "";
    let settled = false;
    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const take = (chunk: Buffer) => {
      log += chunk.toString("utf8");
      if (log.length > MAX_LOG * 2) log = log.slice(-MAX_LOG * 2);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    const timer = setTimeout(() => {
      // SIGTERM 能被脚本吞掉，Linux 上会一直不收尾，所以直接强杀。
      child.kill("SIGKILL");
      log += "\n构建超时。";
      // 强杀后 close 仍可能不来，兜底让请求结束。
      setTimeout(() => finish(log), 2_000);
    }, 25_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code && code !== 0 && !/audit failed/.test(log)) log += `\n进程退出码 ${code}`;
      finish(log);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      finish(`${log}\n${err.message}`);
    });
  });
}
