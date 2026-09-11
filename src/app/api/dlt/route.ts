import { NextRequest, NextResponse } from "next/server";
import { notifyNewWins, notifyTest } from "@/lib/dlt-notify";
import { checkDraws, fetchDltDraws } from "@/lib/dlt";
import { listTickets, saveTickets } from "@/lib/dlt-store";
import { startDltWatcher } from "@/lib/dlt-watch";
import type { DltTicket } from "@/lib/dlt-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(err: unknown, fallback: string, status = 400) {
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

async function payload(tickets: DltTicket[], force = false) {
  startDltWatcher();
  try {
    const draws = await fetchDltDraws(force);
    const hits = checkDraws(tickets, draws);
    void notifyNewWins(false).catch((err) => {
      console.error("[dlt]", err instanceof Error ? err.message : err);
    });
    return {
      latest: draws[0] ?? null,
      tickets,
      hits,
      won: hits.length > 0,
      totalAmount: hits.reduce((sum, hit) => sum + hit.amount, 0),
    };
  } catch (err) {
    return {
      latest: null,
      tickets,
      hits: [] as ReturnType<typeof checkDraws>,
      won: false,
      totalAmount: 0,
      error: err instanceof Error ? err.message : "开奖拉取失败",
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("refresh") === "1";
    const tickets = await listTickets();
    return NextResponse.json({ fetchedAt: Date.now(), ...(await payload(tickets, force)) });
  } catch (err) {
    return fail(err, "读取失败", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { tickets?: Partial<DltTicket>[] };
    const tickets = await saveTickets(Array.isArray(body.tickets) ? body.tickets : []);
    return NextResponse.json(await payload(tickets));
  } catch (err) {
    return fail(err, "保存失败");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action === "test") {
      await notifyTest();
      return NextResponse.json({ ok: true });
    }
    const result = await notifyNewWins(true);
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "推送失败");
  }
}
