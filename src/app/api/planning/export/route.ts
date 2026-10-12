import { NextRequest } from "next/server";
import { exportFormat, exportLesson } from "@/learn/k12-planning/export-lesson";
import { splitPlanningReply, type LessonSource } from "@/learn/k12-planning/lesson-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ format: await exportFormat() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { content?: string; source?: LessonSource };
  const split = typeof body.content === "string" ? splitPlanningReply(body.content) : { prose: "", source: null, streaming: false };
  const source = body.source ?? split.source;
  const file = await exportLesson(source, split.prose);
  if (!file) return Response.json({ error: "没有可下载的材料" }, { status: 400 });
  const encoded = encodeURIComponent(file.name);
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename="${asciiName(file.name)}"; filename*=UTF-8''${encoded}`,
    },
  });
}

function asciiName(name: string) {
  const fallback = name.endsWith(".md") ? "lesson.md" : "lesson.zip";
  const safe = name.replace(/[^\w.\-]+/g, "_").replace(/^_+|_+$/g, "");
  if (!safe || safe.startsWith(".")) return fallback;
  return safe;
}
