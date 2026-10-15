import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { NewProductForm } from "./new-product-form";

export const metadata: Metadata = { title: "Ürün Ekle" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ set?: string; name?: string; img?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Fiyat takibine ürün ekle" description="Ürünü bir kez tanımla, sonra farklı mağazalardaki linklerini ekle." />
      <NewProductForm initial={{ setNum: sp.set ?? "", name: sp.name ?? "", imgUrl: sp.img ?? "" }} />
    </div>
  );
}
