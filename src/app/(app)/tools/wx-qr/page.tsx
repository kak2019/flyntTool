import type { Metadata } from "next";
import WxQrPage from "./page-client";

export const metadata: Metadata = { title: "微信群码" };

export default function Page() {
  return <WxQrPage />;
}
