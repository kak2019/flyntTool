import type { Metadata } from "next";
import CommitPage from "./page-client";

export const metadata: Metadata = { title: "约定式提交" };

export default function Page() {
  return <CommitPage />;
}
