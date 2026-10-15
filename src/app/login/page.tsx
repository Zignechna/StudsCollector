import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LogoMark } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await isAuthenticated()) redirect(next && next.startsWith("/") ? next : "/");
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-header px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at center, #f5b800 0 7px, transparent 8px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="mb-4 size-16" />
          <h1 className="font-display text-4xl font-bold uppercase tracking-wider text-white">
            Brick<span className="text-accent">Kasa</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">Kişisel LEGO koleksiyonun</p>
        </div>
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
