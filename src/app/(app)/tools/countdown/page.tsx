import type { Metadata } from "next";
import CountdownPage from "./page-client";

export const metadata: Metadata = { title: "倒计时" };

export default function Page() {
  return <CountdownPage />;
}
