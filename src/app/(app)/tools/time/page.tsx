import type { Metadata } from "next";
import TimePage from "./page-client";

export const metadata: Metadata = { title: "时间戳" };

export default function Page() {
  return <TimePage />;
}
