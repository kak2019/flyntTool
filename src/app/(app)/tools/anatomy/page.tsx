import type { Metadata } from "next";
import AnatomyPage from "./page-client";

export const metadata: Metadata = { title: "解剖图" };

export default function Page() {
  return <AnatomyPage />;
}
