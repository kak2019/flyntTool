import type { Metadata } from "next";
import HotelPage from "./page-client";

export const metadata: Metadata = { title: "酒店盯价" };

export default function Page() {
  return <HotelPage />;
}
