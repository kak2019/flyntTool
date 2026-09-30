import type { Metadata } from "next";
import ShelfPage from "./page-client";

export const metadata: Metadata = { title: "临时文件架" };

export default function Page() {
  return <ShelfPage />;
}
