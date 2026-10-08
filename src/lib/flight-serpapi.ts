import type { FlightDeal, FlightSegment } from "@/lib/flight-types";

export const FLIGHT_ORIGINS = [
  { id: "PEK", title: "北京首都" },
  { id: "PKX", title: "北京大兴" },
  { id: "TSN", title: "天津滨海" },
] as const;

export const FLIGHT_DESTINATION = { id: "SYX", title: "三亚凤凰" } as const;
export const FLIGHT_ADULTS = 2;
export const FLIGHT_PRICE_LIMIT = Number(process.env.FLIGHT_PRICE_LIMIT || 3500);
export const FLIGHT_WINDOW_END = process.env.FLIGHT_WINDOW_END || `${new Date().getFullYear()}-12-31`;

export const PREFERRED_FLIGHT_COMBOS = [
  ["2026-11-27", "2026-12-05"],
  ["2026-11-27", "2026-12-06"],
  ["2026-11-28", "2026-12-05"],
  ["2026-11-28", "2026-12-06"],
] as const;

type RawSegment = {
  airline?: unknown;
  flight_number?: unknown;
  departure_airport?: { name?: unknown; id?: unknown; time?: unknown };
  arrival_airport?: { name?: unknown; id?: unknown; time?: unknown };
  duration?: unknown;
};

type RawOption = {
  flights?: RawSegment[];
  price?: unknown;
  total_duration?: unknown;
  departure_token?: unknown;
};

type RawResponse = {
  error?: unknown;
  search_metadata?: { google_flights_url?: unknown };
  google_flights_link?: unknown;
  best_flights?: RawOption[];
  other_flights?: RawOption[];
  flights?: Array<{
    departure_airport?: { name?: unknown; id?: unknown };
    arrival_airport?: { name?: unknown; id?: unknown };
    price?: unknown;
    duration?: unknown;
    number_of_stops?: unknown;
    airline?: unknown;
    airline_code?: unknown;
  }>;
};

function apiKey() {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) throw new Error("没配 SerpApi API Key");
  return key;
}

function value(input: unknown) {
  return typeof input === "string" ? input : input == null ? "" : String(input);
}

function number(input: unknown, fallback = 0) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function segments(raw: RawSegment[] | undefined): FlightSegment[] {
  return (raw || []).map((item) => ({
    airline: value(item.airline),
    flightNumber: value(item.flight_number),
    departureAirport: value(item.departure_airport?.name),
    departureId: value(item.departure_airport?.id),
    departureTime: value(item.departure_airport?.time),
    arrivalAirport: value(item.arrival_airport?.name),
    arrivalId: value(item.arrival_airport?.id),
    arrivalTime: value(item.arrival_airport?.time),
    duration: number(item.duration),
  }));
}

function options(data: RawResponse) {
  return [...(data.best_flights || []), ...(data.other_flights || [])]
    .filter((item) => number(item.price) > 0 && Array.isArray(item.flights))
    .sort((a, b) => number(a.price) - number(b.price));
}

async function search(params: Record<string, string>): Promise<RawResponse> {
  const query = new URLSearchParams({ ...params, api_key: apiKey(), output: "json" });
  const res = await fetch(`https://serpapi.com/search.json?${query}`, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as RawResponse;
  if (!res.ok || data.error) throw new Error(value(data.error) || `SerpApi 请求失败（${res.status}）`);
  return data;
}

function commonParams() {
  return {
    engine: "google_flights",
    departure_id: FLIGHT_ORIGINS.map((item) => item.id).join(","),
    arrival_id: FLIGHT_DESTINATION.id,
    type: "1",
    adults: String(FLIGHT_ADULTS),
    travel_class: "1",
    gl: "cn",
    hl: "zh-CN",
    currency: "CNY",
  };
}

function link(data: RawResponse) {
  const candidate = data.search_metadata?.google_flights_url || data.google_flights_link;
  return typeof candidate === "string" ? candidate : undefined;
}

export async function searchExactFlight(outboundDate: string, returnDate: string): Promise<FlightDeal | null> {
  const base = { ...commonParams(), outbound_date: outboundDate, return_date: returnDate };
  const outboundData = await search(base);
  const outbound = options(outboundData)[0];
  const token = value(outbound?.departure_token);
  if (!outbound || !token) return null;

  const returnData = await search({ ...base, departure_token: token });
  const inbound = options(returnData)[0];
  if (!inbound) return null;

  const outboundSegments = segments(outbound.flights);
  const inboundSegments = segments(inbound.flights);
  const allSegments = [...outboundSegments, ...inboundSegments];
  const origin = outboundSegments[0];
  const airlines = [...new Set(allSegments.map((item) => item.airline).filter(Boolean))];
  const flightNumbers = allSegments.map((item) => item.flightNumber).filter(Boolean);
  const stops = Math.max(0, allSegments.length - 2);
  const price = number(inbound.price, number(outbound.price));
  const originId = origin?.departureId || "";
  return {
    key: `exact|${outboundDate}|${returnDate}|${originId || "any"}`,
    kind: "exact",
    title: `${outboundDate.slice(5)} 出发 · ${returnDate.slice(5)} 返回`,
    outboundDate,
    returnDate,
    origin: origin?.departureAirport || "北京/天津",
    originId,
    destination: FLIGHT_DESTINATION.title,
    destinationId: FLIGHT_DESTINATION.id,
    price,
    currency: "CNY",
    adults: FLIGHT_ADULTS,
    airlines,
    flightNumbers,
    totalDuration: number(outbound.total_duration) + number(inbound.total_duration),
    stops,
    segments: allSegments,
    link: link(outboundData),
    observedAt: new Date().toISOString(),
  };
}

export async function searchExploreFlight(startDate: string, endDate: string): Promise<FlightDeal[]> {
  const data = await search({
    engine: "google_travel_explore",
    departure_id: FLIGHT_ORIGINS.map((item) => item.id).join(","),
    arrival_id: FLIGHT_DESTINATION.id,
    outbound_date: startDate,
    return_date: endDate,
    adults: String(FLIGHT_ADULTS),
    travel_mode: "1",
    gl: "cn",
    hl: "zh-CN",
    currency: "CNY",
  });
  return (data.flights || []).map((item, index) => {
    const originId = value(item.departure_airport?.id);
    const price = number(item.price);
    const airline = value(item.airline);
    return {
      key: `explore|${startDate}|${endDate}|${originId}|${value(item.airline_code)}|${index}`,
      kind: "explore" as const,
      title: `灵活日期 · ${startDate.slice(5)} 至 ${endDate.slice(5)}`,
      outboundDate: startDate,
      returnDate: endDate,
      origin: value(item.departure_airport?.name),
      originId,
      destination: value(item.arrival_airport?.name) || FLIGHT_DESTINATION.title,
      destinationId: value(item.arrival_airport?.id) || FLIGHT_DESTINATION.id,
      price,
      currency: "CNY",
      adults: FLIGHT_ADULTS,
      airlines: airline ? [airline] : [],
      flightNumbers: [],
      totalDuration: number(item.duration),
      stops: number(item.number_of_stops),
      segments: [],
      link: typeof data.google_flights_link === "string" ? data.google_flights_link : undefined,
      observedAt: new Date().toISOString(),
    };
  }).filter((item) => item.price > 0);
}
