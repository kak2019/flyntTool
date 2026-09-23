import type { Metadata } from "next";
import PdfMergePage from "./page-client";

export const metadata: Metadata = { title: "PDF 合并" };

export default function Page() {
  return <PdfMergePage />;
}
