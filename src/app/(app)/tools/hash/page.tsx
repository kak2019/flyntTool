import type { Metadata } from "next";
import HashPage from "./page-client";

export const metadata: Metadata = { title: "Hash" };

export default function Page() {
  return <HashPage />;
}
