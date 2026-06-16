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
  frame_emerald: "ring-2 ring-emerald-500",
  frame_sky: "ring-2 ring-sky-500",
  frame_violet: "ring-2 ring-violet-500",
  frame_crimson: "ring-2 ring-rose-600",
  frame_royal: "ring-2 ring-indigo-500",
};

/** Username text-color classes by color item key. */
export const NAME_COLOR: Record<string, string> = {
  color_magenta: "text-[#be3455]",
  color_emerald: "text-emerald-500",
  color_azure: "text-sky-500",
  color_amber: "text-amber-500",
  color_rose: "text-rose-500",
  color_violet: "text-violet-500",
  color_teal: "text-teal-500",
  color_orange: "text-orange-500",
  color_indigo: "text-indigo-500",
  color_gold: "text-amber-400",
};

/** Displayed title text by title item key (ladder of rising prestige). */
export const TITLE_TEXT: Record<string, string> = {
  title_rookie: "Rookie",
  title_parieur: "Parieur",
  title_pronostiqueur: "Pronostiqueur",
  title_tacticien: "Tacticien",
  title_analyste: "Analyste",
  title_stratege: "Stratège",
  title_oracle: "Oracle",
  title_visionnaire: "Visionnaire",
  title_maestro: "Maestro",
  title_devin: "Devin",
  title_legende: "Légende",
  title_mugen: "無限",
  // Spéciaux (non vendables)
  title_first: "First",
  title_staff: "Staff",
};

/** Badge display (emoji + tone) by badge item key. */
export const BADGE_META: Record<string, { emoji: string; label: string }> = {
  badge_first_exact: { emoji: "🎯", label: "Premier score exact" },
  badge_exact_10: { emoji: "🎯", label: "10 scores exacts" },
  badge_exact_25: { emoji: "🏹", label: "25 scores exacts" },
  badge_played_10: { emoji: "⚽", label: "10 pronostics" },
  badge_played_50: { emoji: "📊", label: "50 pronostics" },
  badge_played_100: { emoji: "🔥", label: "100 pronostics" },
  badge_month_gold: { emoji: "🥇", label: "Champion du mois" },
  badge_month_silver: { emoji: "🥈", label: "Vice-champion" },
  badge_month_bronze: { emoji: "🥉", label: "Podium du mois" },
  // Spéciaux (octroyés auto ou par l'admin)
  badge_founder: { emoji: "🏛️", label: "Fondateur" },
  badge_beta: { emoji: "🧪", label: "Beta-testeur" },
  badge_bughunter: { emoji: "🐛", label: "Bug hunter" },
  badge_vip: { emoji: "💎", label: "VIP" },
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
