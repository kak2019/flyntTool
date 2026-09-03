import type { Metadata } from "next";
import TranslatePage from "./page-client";

export const metadata: Metadata = { title: "快速翻译" };

export default function Page() {
  return <TranslatePage />;
}
