// Mugen — cosmetic visual registry.
//
// The shop catalog's authoritative price/availability lives in the DB
// (`shop_items`); the *visuals* live here, keyed by the same item key. Classes
// are written as plain string literals so Tailwind's JIT picks them up.

/** Avatar ring classes by frame item key. */
export const FRAME_RING: Record<string, string> = {
  frame_steel: "ring-2 ring-slate-400",
  frame_neon: "ring-2 ring-fuchsia-500",
  frame_gold: "ring-2 ring-amber-400",
};

/** Username text-color classes by color item key. */
export const NAME_COLOR: Record<string, string> = {
  color_magenta: "text-[#be3455]",
  color_emerald: "text-emerald-500",
  color_azure: "text-sky-500",
  color_amber: "text-amber-500",
};

/** Displayed title text by title item key. */
export const TITLE_TEXT: Record<string, string> = {
  title_rookie: "Rookie",
  title_tacticien: "Tacticien",
  title_visionnaire: "Visionnaire",
};

/** Badge display (emoji + tone) by badge item key. */
export const BADGE_META: Record<string, { emoji: string; label: string }> = {
  badge_first_exact: { emoji: "🎯", label: "Premier score exact" },
  badge_exact_10: { emoji: "🎯", label: "10 scores exacts" },
  badge_played_50: { emoji: "📊", label: "50 pronostics" },
  badge_month_gold: { emoji: "🥇", label: "Champion du mois" },
  badge_month_silver: { emoji: "🥈", label: "Vice-champion" },
  badge_month_bronze: { emoji: "🥉", label: "Podium du mois" },
};

export function frameRing(key: string | null | undefined): string {
  return (key && FRAME_RING[key]) || "";
}
export function nameColor(key: string | null | undefined): string {
  return (key && NAME_COLOR[key]) || "";
}
export function titleText(key: string | null | undefined): string {
  return (key && TITLE_TEXT[key]) || "";
}
