import type { Metadata } from "next";
import QrPage from "./page-client";

export const metadata: Metadata = { title: "二维码" };

export default function Page() {
  return <QrPage />;
}
