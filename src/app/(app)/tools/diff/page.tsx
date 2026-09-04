import type { Metadata } from "next";
import DiffPage from "./page-client";

export const metadata: Metadata = { title: "文本 Diff" };

export default function Page() {
  return <DiffPage />;
}
