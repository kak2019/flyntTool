export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startDltWatcher } = await import(
    /* webpackIgnore: true */ "./lib/dlt-watch"
  );
  startDltWatcher();
}
