import type { Metadata } from "next";
import IdPage from "./page-client";

export const metadata: Metadata = { title: "UUID / NanoID" };

export default function Page() {
  return <IdPage />;
}
