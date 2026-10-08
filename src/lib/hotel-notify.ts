import { HOTEL_PLACES, searchHotelQuotes, shanghaiDate } from "@/lib/hotel-mcp";
import { dealKey, readHotelStore, writeHotelStore, type HotelDeal } from "@/lib/hotel-store";
import { hasServerChan, scSend } from "@/lib/serverchan";

export type HotelWatchResult = {
  sent: boolean;
  reason: string;
  checkIn: string;
  deals: HotelDeal[];
};

function freshDeals(deals: HotelDeal[], notified: Record<string, number>) {
  return deals.filter((deal) => {
    const prev = notified[deal.key];
    return prev === undefined || deal.price < prev;
  });
}

function pushTitle(deals: HotelDeal[]) {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const deal of deals) {
    const label = deal.placeId === "tianjin" ? "天津" : deal.place.startsWith("云南") ? "云南" : deal.place;
    if (!counts.has(label)) order.push(label);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return `${order.map((label) => `${label}${counts.get(label)}家`).join("、")}低于300`;
}

function pushBody(checkIn: string, deals: HotelDeal[]) {
  const lines = [`${checkIn} 入住，住 1 晚。低于 300 元才发，同一家同一天价格没再降就不重复发。`, ""];
  let current = "";
  for (const deal of deals) {
    if (deal.place !== current) {
      current = deal.place;
      lines.push(`**${deal.place}**`);
    }
    const link = deal.url ? ` [打开](${deal.url})` : "";
    lines.push(`- ${deal.name} · ${deal.brand} · ${deal.price}元${link}`);
  }
  return lines.join("\n");
}

export async function runHotelScan(): Promise<HotelWatchResult> {
  const checkIn = shanghaiDate(1);
  const store = await readHotelStore();
  const deals: HotelDeal[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  async function collect(placeId: string, title: string, query: string) {
    try {
      const quotes = await searchHotelQuotes(query, checkIn);
      for (const quote of quotes) {
        if (!quote.hotelId) continue;
        const key = dealKey(quote.hotelId, checkIn);
        if (seen.has(key)) continue;
        seen.add(key);
        deals.push({
          key,
          placeId,
          place: title,
          hotelId: quote.hotelId,
          name: quote.name,
          brand: quote.brandLabel,
          price: quote.price,
          checkIn,
          url: quote.url,
        });
      }
    } catch (err) {
      errors.push(`${title}：${err instanceof Error ? err.message : "查询失败"}`);
    }
  }

  for (const place of HOTEL_PLACES) {
    await collect(place.id, place.title, place.place);
  }
  for (const place of (await readHotelStore()).places) {
    await collect(place.id, place.title, place.place);
  }

  const fresh = freshDeals(deals, store.notified);
  let sent = false;
  let reason = fresh.length ? pushTitle(fresh) : deals.length ? "低于 300 的都通知过了" : "没有低于 300 元的";
  if (errors.length && !deals.length) reason = errors[0];

  if (fresh.length && !hasServerChan()) {
    reason = "没配 Server酱 SendKey";
  } else if (fresh.length) {
    try {
      await scSend(pushTitle(fresh), pushBody(checkIn, fresh), pushTitle(fresh), "酒店");
      for (const deal of fresh) store.notified[deal.key] = deal.price;
      sent = true;
    } catch (err) {
      reason = err instanceof Error ? err.message : "推送失败";
      errors.push(reason);
    }
  }

  const latest = await readHotelStore();
  await writeHotelStore({
    notified: store.notified,
    lastRunAt: new Date().toISOString(),
    lastError: errors.join("；"),
    checkIn,
    deals,
    places: latest.places,
  });

  return { sent, reason, checkIn, deals };
}
