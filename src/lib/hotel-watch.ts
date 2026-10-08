import { runHotelScan } from "@/lib/hotel-notify";

const INTERVAL_MS = 60 * 60 * 1000;

const globalWatch = globalThis as typeof globalThis & {
  __flyntHotelWatch?: boolean;
  __flyntHotelRunning?: boolean;
  __flyntHotelAgain?: boolean;
};

export function hotelWatchRunning() {
  return globalWatch.__flyntHotelRunning === true;
}

async function tick() {
  if (globalWatch.__flyntHotelRunning) {
    globalWatch.__flyntHotelAgain = true;
    return;
  }
  globalWatch.__flyntHotelRunning = true;
  try {
    do {
      globalWatch.__flyntHotelAgain = false;
      const result = await runHotelScan();
      console.info("[hotel]", result.sent ? `已推送 ${result.reason}` : result.reason);
    } while (globalWatch.__flyntHotelAgain);
  } catch (err) {
    console.error("[hotel]", err instanceof Error ? err.message : err);
  } finally {
    globalWatch.__flyntHotelRunning = false;
  }
}

export function requestHotelScan() {
  if (globalWatch.__flyntHotelWatch) {
    void tick();
    return;
  }
  startHotelWatcher();
}

export function startHotelWatcher() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (globalWatch.__flyntHotelWatch) return;
  globalWatch.__flyntHotelWatch = true;
  void tick();
  const timer = setInterval(() => void tick(), INTERVAL_MS);
  timer.unref?.();
}
