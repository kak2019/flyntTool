import { notifyNewWins } from "@/lib/dlt-notify";

const INTERVAL_MS = 15 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

async function tick(force = false) {
  if (running) return;
  running = true;
  try {
    const result = await notifyNewWins(force);
    if (result.sent) console.info("[dlt]", result.reason);
  } catch (err) {
    console.error("[dlt]", err instanceof Error ? err.message : err);
  } finally {
    running = false;
  }
}

export function startDltWatcher() {
  if (timer) return;
  void tick(true);
  timer = setInterval(() => void tick(true), INTERVAL_MS);
  timer.unref?.();
}
