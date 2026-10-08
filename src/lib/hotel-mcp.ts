export const HOTEL_PRICE_LIMIT = 300;

export const HOTEL_PLACES = [
  { id: "tianjin", title: "天津", place: "天津 中国" },
  { id: "kunming", title: "云南 · 昆明", place: "昆明 中国" },
  { id: "dali", title: "云南 · 大理", place: "大理 中国" },
  { id: "lijiang", title: "云南 · 丽江", place: "丽江 中国" },
  { id: "banna", title: "云南 · 西双版纳", place: "西双版纳 中国" },
  { id: "shangrila", title: "云南 · 香格里拉", place: "香格里拉 中国" },
] as const;

export type HotelPlaceId = (typeof HOTEL_PLACES)[number]["id"];

export type HotelQuote = {
  hotelId: number;
  name: string;
  brandLabel: "亚朵" | "万豪" | "喜来登";
  price: number;
  url?: string;
};

type RawHotel = {
  hotelId?: number;
  name?: string;
  brand?: string | null;
  bookingUrl?: string;
  price?: { hasPrice?: boolean; lowestPrice?: number; currency?: string };
};

function mcpUrl() {
  return (process.env.ROLLINGGO_MCP_URL || "https://mcp.rollinggo.cn/mcp").replace(/\/$/, "");
}

export function shanghaiDate(offsetDays = 0) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function matchBrand(name: string, brand: string): HotelQuote["brandLabel"] | null {
  const text = `${name} ${brand}`.toLowerCase();
  if (text.includes("喜来登") || text.includes("sheraton")) return "喜来登";
  if (text.includes("亚朵") || text.includes("atour")) return "亚朵";
  if (text.includes("万豪") || text.includes("marriott")) return "万豪";
  return null;
}

function readToolText(raw: string) {
  let text = "";
  let error = "";
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
    try {
      const json = JSON.parse(payload) as {
        error?: { message?: string } | string;
        result?: { isError?: boolean; content?: { text?: string }[] };
      };
      if (typeof json.error === "string") error = json.error;
      else if (json.error?.message) error = json.error.message;
      const content = json.result?.content?.map((item) => item.text || "").join("") || "";
      if (json.result?.isError && content) error = content;
      if (content) text = content;
    } catch {
      // ignore non-json lines
    }
  }
  if (error) throw new Error(error.slice(0, 200));
  if (!text) throw new Error("酒店接口没有返回内容");
  return text;
}

export async function searchHotelQuotes(place: string, checkIn: string): Promise<HotelQuote[]> {
  const apiKey = process.env.ROLLINGGO_MCP_KEY?.trim();
  if (!apiKey) throw new Error("未配置 ROLLINGGO_MCP_KEY");
  const res = await fetch(mcpUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "searchHotels",
        arguments: {
          originQuery: `${place} 亚朵 万豪 喜来登`,
          place,
          placeType: "城市",
          checkInParam: { checkInDate: checkIn, stayNights: 1, adultCount: 2 },
          hotelTags: {
            preferredBrands: ["亚朵", "万豪", "喜来登"],
            maxPricePerNight: HOTEL_PRICE_LIMIT - 0.01,
          },
          size: 20,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`酒店接口失败（${res.status}）`);
  const data = JSON.parse(readToolText(await res.text())) as { hotelInformationList?: RawHotel[] };
  const quotes: HotelQuote[] = [];
  for (const hotel of data.hotelInformationList ?? []) {
    const name = String(hotel.name || "").trim();
    const brandLabel = matchBrand(name, String(hotel.brand || ""));
    const price = Number(hotel.price?.lowestPrice);
    const currency = String(hotel.price?.currency || "CNY").toUpperCase();
    if (!brandLabel || !name || !Number.isFinite(price) || price >= HOTEL_PRICE_LIMIT || currency !== "CNY") continue;
    quotes.push({
      hotelId: Number(hotel.hotelId) || 0,
      name,
      brandLabel,
      price,
      url: hotel.bookingUrl ? String(hotel.bookingUrl) : undefined,
    });
  }
  quotes.sort((a, b) => a.price - b.price);
  return quotes;
}
