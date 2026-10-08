export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startHotelWatcher } = await import("@/lib/hotel-watch");
  startHotelWatcher();
  const { startFlightBootstrap } = await import("@/lib/flight-bootstrap");
  startFlightBootstrap();
}
