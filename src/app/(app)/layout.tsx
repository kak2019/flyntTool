import { SiteHeader } from "@/components/SiteHeader";
import { DailyLearn } from "@/components/DailyLearn";

export default function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <DailyLearn />
    </div>
  );
}
