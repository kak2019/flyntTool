import type { Metadata } from "next";
import FlightPage from "./page-client";

export const metadata: Metadata = { title: "机票盯价" };

export default function Page() {
  return <FlightPage />;
}
