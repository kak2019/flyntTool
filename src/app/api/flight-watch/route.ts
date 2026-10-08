import { NextRequest, NextResponse } from "next/server";
import { FLIGHT_PRICE_LIMIT, FLIGHT_WINDOW_END, FLIGHT_ORIGINS, FLIGHT_DESTINATION, FLIGHT_ADULTS, PREFERRED_FLIGHT_COMBOS } from "@/lib/flight-serpapi";
import { readFlightStore } from "@/lib/flight-store";
import { flightWatchRunning, requestFlightScan } from "@/lib/flight-watch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readFlightStore();
  return NextResponse.json({
    running: flightWatchRunning(),
    priceLimit: FLIGHT_PRICE_LIMIT,
    windowEnd: FLIGHT_WINDOW_END,
    adults: FLIGHT_ADULTS,
    origins: FLIGHT_ORIGINS,
    destination: FLIGHT_DESTINATION,
    preferredCombos: PREFERRED_FLIGHT_COMBOS,
    lastRunAt: store.lastRunAt,
    lastError: store.lastError,
    deals: store.deals,
    notified: store.notified,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "scan") return NextResponse.json({ error: "不认识的操作" }, { status: 400 });
  requestFlightScan();
  return NextResponse.json({ ok: true, running: flightWatchRunning() });
}
