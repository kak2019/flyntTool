import { SiteHeader } from "@/components/SiteHeader";

export default function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
