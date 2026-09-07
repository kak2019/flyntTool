import type { Metadata } from "next";
import CutoutPage from "./page-client";

export const metadata: Metadata = { title: "抠图去背景" };

export default function Page() {
  return <CutoutPage />;
}
