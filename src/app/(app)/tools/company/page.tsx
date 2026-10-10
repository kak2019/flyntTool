import type { Metadata } from "next";
import CompanyPage from "./page-client";

export const metadata: Metadata = { title: "查公司" };

export default function Page() {
  return <CompanyPage />;
}
