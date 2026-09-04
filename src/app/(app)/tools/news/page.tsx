import type { Metadata } from "next";
import NewsPage from "./page-client";

export const metadata: Metadata = { title: "新闻聚合" };

export default function Page() {
  return <NewsPage />;
}
