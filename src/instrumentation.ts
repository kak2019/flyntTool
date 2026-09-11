export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startDltWatcher } = await import("./lib/dlt-watch");
  startDltWatcher();
}
