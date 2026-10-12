import type { Metadata } from "next";
import MathPage from "./page-client";

export const metadata: Metadata = { title: "数学辅导" };

export default function Page() {
  return <MathPage />;
}
