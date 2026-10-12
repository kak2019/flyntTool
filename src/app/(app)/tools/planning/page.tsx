import type { Metadata } from "next";
import PlanningPage from "@/learn/k12-planning/page-client";

export const metadata: Metadata = { title: "备课" };

export default function Page() {
  return <PlanningPage />;
}
