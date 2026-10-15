import { MobileNav, TopNav } from "@/components/nav";
import { StorageBanner } from "@/components/storage-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav />
      <StorageBanner />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-5 md:pb-12 md:pt-8 lg:px-6">{children}</main>
      <MobileNav />
    </div>
  );
}

// Every screen reads the user's own database, so nothing here is prerendered.
export const dynamic = "force-dynamic";
