import type { Metadata } from "next";
import PatentFigPage from "./page-client";

export const metadata: Metadata = { title: "专利附图嵌入" };

export default function Page() {
  return <PatentFigPage />;
}
