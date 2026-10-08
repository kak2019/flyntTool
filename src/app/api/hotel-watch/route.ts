import { NextRequest, NextResponse } from "next/server";
import { HOTEL_PLACES, HOTEL_PRICE_LIMIT } from "@/lib/hotel-mcp";
import { addCustomPlace, readHotelStore, removeCustomPlace } from "@/lib/hotel-store";
import { hotelWatchRunning, startHotelWatcher, requestHotelScan } from "@/lib/hotel-watch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

function placeList(custom: { id: string; title: string }[]) {
  return [
    ...HOTEL_PLACES.map((place) => ({ id: place.id, title: place.title, custom: false })),
    ...custom.map((place) => ({ id: place.id, title: place.title, custom: true })),
  ];
}

export async function GET() {
  startHotelWatcher();
  const store = await readHotelStore();
  return NextResponse.json({
    running: hotelWatchRunning(),
    priceLimit: HOTEL_PRICE_LIMIT,
    places: placeList(store.places),
    lastRunAt: store.lastRunAt,
    lastError: store.lastError,
    checkIn: store.checkIn,
    deals: store.deals,
    notified: store.notified,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string; name?: string; id?: string };
    if (body.action === "add") {
      const places = await addCustomPlace(String(body.name ?? ""));
      requestHotelScan();
      return NextResponse.json({ places: placeList(places) });
    }
    if (body.action === "remove") {
      const places = await removeCustomPlace(String(body.id ?? ""));
      return NextResponse.json({ places: placeList(places) });
    }
    return NextResponse.json({ error: "不认识的操作" }, { status: 400 });
  } catch (err) {
    return fail(err, "保存失败");
  }
}
