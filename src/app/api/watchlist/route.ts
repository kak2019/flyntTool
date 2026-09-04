import { NextRequest, NextResponse } from "next/server";
import { addWatch, listWatch, removeWatch, updateWatch } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  const status = message.includes("找不到") || message.includes("不能空") ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    return NextResponse.json({ items: await listWatch() });
  } catch (err) {
    return fail(err, "读取失败");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { title?: string; note?: string };
    const item = await addWatch(String(body.title ?? ""), String(body.note ?? ""));
    return NextResponse.json({ item });
  } catch (err) {
    return fail(err, "添加失败");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      title?: string;
      note?: string;
    };
    if (!body.id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const item = await updateWatch(body.id, { title: body.title, note: body.note });
    return NextResponse.json({ item });
  } catch (err) {
    return fail(err, "保存失败");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    await removeWatch(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "删除失败");
  }
}
