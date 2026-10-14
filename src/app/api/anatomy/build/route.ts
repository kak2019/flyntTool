import { NextRequest, NextResponse } from "next/server";
import { runAnatomyBuild } from "@/learn/anatomy/run-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { script?: string };
  const script = String(body.script ?? "");
  if (!script.trim()) {
    return NextResponse.json({ error: "没有构建脚本" }, { status: 400 });
  }
  const result = await runAnatomyBuild(script);
  return NextResponse.json(result);
}
