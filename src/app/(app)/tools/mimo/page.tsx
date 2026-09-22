import type { Metadata } from "next";
import MimoPage from "./page-client";

export const metadata: Metadata = { title: "MiMo 问答" };

export default function Page() {
  return <MimoPage />;
}
