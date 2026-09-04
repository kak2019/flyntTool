import type { Metadata } from "next";
import UrlPage from "./page-client";

export const metadata: Metadata = { title: "URL / Query" };

export default function Page() {
  return <UrlPage />;
}
