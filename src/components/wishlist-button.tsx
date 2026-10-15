"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleWishlist } from "@/app/actions/collection";
import { toastResult } from "./toast";

export function WishlistButton({
  setNum,
  active,
  owned,
  inline = false,
}: {
  setNum: string;
  active: boolean;
  owned: boolean;
  inline?: boolean;
}) {
  const [pending, start] = useTransition();
  const [on, setOn] = useOptimistic(active);
  if (owned && !active) return null;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOn(!on);
          toastResult(await toggleWishlist(setNum));
        })
      }
      aria-pressed={on}
      aria-label={on ? "İstek listesinden çıkar" : "İstek listesine ekle"}
      title={on ? "İstek listesinden çıkar" : "İstek listesine ekle"}
      className={
        inline
          ? `inline-flex size-8 items-center justify-center rounded-lg transition ${on ? "text-info" : "text-muted hover:bg-surface-2 hover:text-fg"}`
          : `flex size-7 items-center justify-center rounded-full shadow transition ${
              on
                ? "bg-info text-white"
                : "bg-black/50 text-white/90 opacity-100 hover:bg-black/70 md:opacity-0 md:group-hover:opacity-100"
            }`
      }
    >
      <Star className={`size-3.5 ${on ? "fill-current" : ""}`} />
    </button>
  );
}
