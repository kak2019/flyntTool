import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { lessonMarkdown, type LessonSource } from "@/learn/k12-planning/lesson-files";

const SCRIPT = join(process.cwd(), "src/learn/k12-planning/scripts/render_documents.py");

let docxPython: string | null | undefined;

export async function exportFormat(): Promise<"docx" | "md"> {
  return (await pythonWithDocx()) ? "docx" : "md";
}

export async function exportLesson(source: LessonSource | null, prose: string) {
  const docs = source?.documents ?? [];
  if (source && docs.length && (await pythonWithDocx())) {
    const files = await renderDocx(source);
    if (files?.length) return zipFiles("备课.zip", files);
  }
  if (source && docs.length) {
    const files = lessonMarkdown(source).map((file) => ({ name: file.name, data: Buffer.from(file.text, "utf8") }));
    if (files.length === 1) return singleFile(files[0].name, files[0].data, "text/markdown; charset=utf-8");
    return zipFiles("备课.zip", files);
  }
  const text = prose.trim();
  if (!text) return null;
  return singleFile("备课.md", Buffer.from(text + "\n", "utf8"), "text/markdown; charset=utf-8");
}

function singleFile(name: string, data: Buffer, type: string) {
  return { name, data, type };
}

async function zipFiles(name: string, files: { name: string; data: Buffer }[]) {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const file of files) {
    let filename = file.name;
    let n = 2;
    while (used.has(filename)) {
      const dot = file.name.lastIndexOf(".");
      filename = `${file.name.slice(0, dot)}-${n}${file.name.slice(dot)}`;
      n += 1;
    }
    used.add(filename);
    zip.file(filename, file.data);
  }
  const data = await zip.generateAsync({ type: "nodebuffer" });
  return { name, data, type: "application/zip" };
}

async function renderDocx(source: LessonSource) {
  const python = await pythonWithDocx();
  if (!python) return null;
  const dir = await mkdtemp(join(tmpdir(), "flynt-plan-"));
  try {
    const input = join(dir, "lesson.json");
    const outdir = join(dir, "out");
    await writeFile(input, JSON.stringify(source), "utf8");
    const code = await run(python, [SCRIPT, input, "--format", "docx", "--outdir", outdir], 40000);
    if (code !== 0) return null;
    const names = (await readdir(outdir)).filter((name) => name.endsWith(".docx"));
    if (!names.length) return null;
    return Promise.all(
      names.map(async (name) => ({ name, data: await readFile(join(outdir, name)) })),
    );
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function pythonWithDocx() {
  if (docxPython !== undefined) return docxPython;
  for (const exe of pythonCandidates()) {
    const code = await run(exe, ["-c", "import docx"], 8000);
    if (code === 0) {
      docxPython = exe;
      return exe;
    }
  }
  docxPython = null;
  return null;
}

function pythonCandidates() {
  const found: string[] = [];
  if (process.env.PYTHON) found.push(process.env.PYTHON);
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const root = join(process.env.LOCALAPPDATA, "Programs", "Python");
    try {
      for (const name of readdirSync(root)) found.push(join(root, name, "python.exe"));
    } catch {
      /* no local Python install */
    }
  }
  found.push("python3", "python");
  return found;
}

function run(cmd: string, args: string[], timeoutMs: number) {
  return new Promise<number | null>((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { windowsHide: true });
    } catch {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => {
      child.kill();
      resolve(null);
    }, timeoutMs);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}
