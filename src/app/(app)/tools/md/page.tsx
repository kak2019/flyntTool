import type { Metadata } from "next";
import MarkdownPage from "./page-client";

export const metadata: Metadata = { title: "Markdown 预览" };

export default function Page() {
  return <MarkdownPage />;
}
