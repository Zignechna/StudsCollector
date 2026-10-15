"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-toggle";

export function ThemeSetting() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
      {(
        [
          ["dark", "Koyu", Moon],
          ["light", "Açık", Sun],
        ] as const
      ).map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => setTheme(key)}
          className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${theme === key ? "border-accent bg-accent-soft" : "border-line bg-surface-2 hover:border-line-strong"}`}
          aria-pressed={theme === key}
        >
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}
