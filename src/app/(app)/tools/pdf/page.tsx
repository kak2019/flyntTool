import type { Metadata } from "next";
import PdfPage from "./page-client";

export const metadata: Metadata = { title: "PDF 对照翻译" };

export default function Page() {
  return <PdfPage />;
}
