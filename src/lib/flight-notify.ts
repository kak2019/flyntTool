import { hasServerChan, scSend } from "@/lib/serverchan";
import { FLIGHT_PRICE_LIMIT, FLIGHT_WINDOW_END, PREFERRED_FLIGHT_COMBOS, searchExactFlight, searchExploreFlight } from "@/lib/flight-serpapi";
import { readFlightStore, writeFlightStore } from "@/lib/flight-store";
import type { FlightDeal } from "@/lib/flight-types";

export type FlightWatchResult = {
  sent: boolean;
  reason: string;
  deals: FlightDeal[];
  lastRunAt: string;
};

function shanghaiDate(offset = 0) {
  const now = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
}

function freshDeals(deals: FlightDeal[], notified: Record<string, number>) {
  return deals.filter((deal) => {
    if (deal.price > FLIGHT_PRICE_LIMIT) return false;
    const previous = notified[deal.key];
    return previous === undefined || deal.price < previous;
  });
}

function dealLabel(deal: FlightDeal) {
  const airline = deal.airlines.length ? deal.airlines.join("/") : "航班";
  const direct = deal.stops === 0 ? "直飞" : `${deal.stops}次中转`;
  return `${deal.title} · ${deal.origin || "北京/天津"} → 三亚 · ${airline} · ${direct} · ${deal.price}元`;
}

function pushBody(deals: FlightDeal[]) {
  const lines = [
    `两位成人，北京/天津 → 三亚。两人往返总价不超过 ${FLIGHT_PRICE_LIMIT} 元，或出现新低时通知。`,
    "",
  ];
  for (const deal of deals) {
    lines.push(`- ${dealLabel(deal)}`);
    if (deal.flightNumbers.length) lines.push(`  航班：${deal.flightNumbers.join(" / ")}`);
    if (deal.link) lines.push(`  [打开 Google Flights](${deal.link})`);
  }
  lines.push("", "价格是查询时的快照，购买前请重新确认。", `查询时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`);
  return lines.join("\n");
}

export async function runFlightScan(): Promise<FlightWatchResult> {
  const store = await readFlightStore();
  const deals: FlightDeal[] = [];
  const errors: string[] = [];
  const today = shanghaiDate();
  const combos = PREFERRED_FLIGHT_COMBOS.filter(([outbound, returnDate]) => outbound >= today && returnDate >= today);
  const combo = combos[store.scanIndex % Math.max(1, combos.length)] || PREFERRED_FLIGHT_COMBOS[0];

  try {
    deals.push(...(await searchExploreFlight(today, FLIGHT_WINDOW_END)));
  } catch (err) {
    errors.push(`灵活日期：${err instanceof Error ? err.message : "查询失败"}`);
  }

  try {
    const exact = await searchExactFlight(combo[0], combo[1]);
    if (exact) deals.push(exact);
  } catch (err) {
    errors.push(`${combo[0]}：${err instanceof Error ? err.message : "查询失败"}`);
  }

  const fresh = freshDeals(deals, store.notified);
  let sent = false;
  let reason = fresh.length ? `发现 ${fresh.length} 条好价` : deals.length ? "本次没有低于阈值的新价格" : "没有查到航班";
  if (errors.length && !deals.length) reason = errors[0];

  if (fresh.length && !hasServerChan()) {
    reason = "没配 Server酱 SendKey";
  } else if (fresh.length) {
    try {
      await scSend("三亚机票发现好价", pushBody(fresh), `${fresh.length} 条好价`, "机票");
      for (const deal of fresh) store.notified[deal.key] = deal.price;
      sent = true;
    } catch (err) {
      reason = err instanceof Error ? err.message : "推送失败";
      errors.push(reason);
    }
  }

  const now = new Date().toISOString();
  await writeFlightStore({
    notified: store.notified,
    lastRunAt: now,
    lastError: errors.join("；"),
    deals: deals.sort((a, b) => a.price - b.price).slice(0, 30),
    scanIndex: store.scanIndex + 1,
  });
  return { sent, reason, deals, lastRunAt: now };
}
