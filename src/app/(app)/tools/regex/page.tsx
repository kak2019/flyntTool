import type { Metadata } from "next";
import RegexPage from "./page-client";

export const metadata: Metadata = { title: "正则测试" };

export default function Page() {
  return <RegexPage />;
}
