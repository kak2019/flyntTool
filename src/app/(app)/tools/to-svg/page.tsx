import type { Metadata } from "next";
import SvgPage from "./page-client";

export const metadata: Metadata = { title: "图片转 SVG" };

export default function Page() {
  return <SvgPage />;
}
