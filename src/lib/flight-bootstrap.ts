const INTERVAL_MS = 12 * 60 * 60 * 1000;

const globalBootstrap = globalThis as typeof globalThis & {
  __flyntFlightBootstrap?: boolean;
};

async function sessionToken(password: string) {
  const bytes = new TextEncoder().encode(`flynt-tools:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function trigger() {
  const password = process.env.SITE_PASSWORD;
  if (!password) return;
  const port = process.env.PORT || "3001";
  const token = await sessionToken(password);
  try {
    await fetch(`http://127.0.0.1:${port}/api/flight-watch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `flynt_tools_session=${token}`,
      },
      body: JSON.stringify({ action: "scan" }),
    });
  } catch (err) {
    console.error("[flight] bootstrap", err instanceof Error ? err.message : err);
  }
}

export function startFlightBootstrap() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.FLIGHT_WATCH_AUTOSTART !== "true") return;
  if (globalBootstrap.__flyntFlightBootstrap) return;
  globalBootstrap.__flyntFlightBootstrap = true;
  setTimeout(() => void trigger(), 5000).unref?.();
  const timer = setInterval(() => void trigger(), INTERVAL_MS);
  timer.unref?.();
}
