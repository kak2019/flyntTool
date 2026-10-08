const globalWatch = globalThis as typeof globalThis & {
  __flyntFlightRunning?: boolean;
  __flyntFlightAgain?: boolean;
};

export function flightWatchRunning() {
  return globalWatch.__flyntFlightRunning === true;
}

async function tick() {
  if (globalWatch.__flyntFlightRunning) {
    globalWatch.__flyntFlightAgain = true;
    return;
  }
  globalWatch.__flyntFlightRunning = true;
  try {
    const { runFlightScan } = await import("@/lib/flight-notify");
    do {
      globalWatch.__flyntFlightAgain = false;
      const result = await runFlightScan();
      console.info("[flight]", result.sent ? `已推送 ${result.reason}` : result.reason);
    } while (globalWatch.__flyntFlightAgain);
  } catch (err) {
    console.error("[flight]", err instanceof Error ? err.message : err);
  } finally {
    globalWatch.__flyntFlightRunning = false;
  }
}

export function requestFlightScan() {
  void tick();
}

export function startFlightWatcher() {
  requestFlightScan();
}
