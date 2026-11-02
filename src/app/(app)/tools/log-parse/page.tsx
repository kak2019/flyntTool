import type { Metadata } from "next";
import LogParsePage from "./page-client";

export const metadata: Metadata = { title: "日志解析" };

export default function Page() {
  return <LogParsePage />;
}
