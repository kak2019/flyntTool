import type { Metadata } from "next";
import ClassPetPage from "./page-client";

export const metadata: Metadata = { title: "班级宠物乐园" };

export default function Page() {
  return <ClassPetPage />;
}
