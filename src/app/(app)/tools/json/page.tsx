import type { Metadata } from "next";
import JsonPage from "./page-client";

export const metadata: Metadata = { title: "JSON 格式化" };

export default function Page() {
  return <JsonPage />;
}
