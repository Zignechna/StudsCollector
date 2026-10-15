import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { AddSetSearch } from "./add-set-search";

export const metadata: Metadata = { title: "Set Ekle" };

export default async function AddPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Set ekle"
        description="Set numarası (ör. 10300 veya 10300-1) ya da isimle ara. Seti eklediğinde parça listesi ve minifigürleri otomatik gelir."
      />
      <AddSetSearch initialQuery={q ?? ""} />
    </div>
  );
}
