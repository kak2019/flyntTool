import type { Metadata } from "next";
import RgbPage from "./page-client";

export const metadata: Metadata = { title: "RGB / Hex" };

export default function Page() {
  return <RgbPage />;
}
