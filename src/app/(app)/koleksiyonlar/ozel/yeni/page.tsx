import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { CollectionForm } from "../collection-form";

export const metadata: Metadata = { title: "Yeni Özel Koleksiyon" };

export default function NewCollectionPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Yeni özel koleksiyon" description="Önce koleksiyonu oluştur, sonra içine set ve figür ekle." />
      <CollectionForm />
    </div>
  );
}
