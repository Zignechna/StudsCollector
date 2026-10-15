export type RetirementStatus = "retired" | "retiring" | "available" | "unknown";

export const RETIRING_WINDOW_DAYS = 183;

export function effectiveExit(set: { exitDate?: string | null; exitDateManual?: string | null }) {
  return set.exitDateManual || set.exitDate || null;
}

export function retirementStatus(set: {
  exitDate?: string | null;
  exitDateManual?: string | null;
  launchDate?: string | null;
}): RetirementStatus {
  const exit = effectiveExit(set);
  if (!exit) return "unknown";
  const days = (new Date(exit).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "retired";
  if (days <= RETIRING_WINDOW_DAYS) return "retiring";
  return "available";
}

export const statusLabels: Record<RetirementStatus, string> = {
  retired: "Emekli",
  retiring: "Yakında emekli",
  available: "Piyasada",
  unknown: "Bilinmiyor",
};
