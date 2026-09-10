import type { Metadata } from "next";
import Base64Page from "./page-client";

export const metadata: Metadata = { title: "Base64" };

export default function Page() {
  return <Base64Page />;
}
