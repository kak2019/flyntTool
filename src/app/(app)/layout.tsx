import { SiteHeader } from "@/components/SiteHeader";
import { DailyLearn } from "@/components/DailyLearn";

export default function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <p className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-center text-sm text-zinc-600">
        网站不会保留任何信息，全都靠浏览器来执行。
      </p>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <DailyLearn />
    </div>
  );
}
