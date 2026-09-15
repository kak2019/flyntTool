import type { Metadata } from "next";
import WxQrPage from "./_client";

export const metadata: Metadata = { title: "Linchang微信群码" };

export default function Page() {
  return <WxQrPage />;
}
