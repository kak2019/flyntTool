import type { Metadata } from "next";
import FiPage from "./page-client";

export const metadata: Metadata = { title: "财务自由" };

export default function Page() {
  return <FiPage />;
}
