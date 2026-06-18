// Mugen — group cosmetic visual registry.
//
// Mirrors lib/domain/cosmetics.ts: the authoritative price/availability lives
// in the DB (`group_shop_items`); the *visuals* live here, keyed by item key.
// Classes are plain string literals so Tailwind's JIT picks them up.

/** Card background (gradient) classes by group_bg item key. */
export const GROUP_BG: Record<string, string> = {
  group_bg_slate: "bg-gradient-to-br from-slate-700/30 via-surface to-surface",
  group_bg_ocean: "bg-gradient-to-br from-sky-700/30 via-surface to-surface",
  group_bg_sunset: "bg-gradient-to-br from-orange-600/30 via-surface to-surface",
  group_bg_forest: "bg-gradient-to-br from-emerald-700/30 via-surface to-surface",
};

/** Emoji by group_icon item key. */
export const GROUP_ICON: Record<string, string> = {
  group_icon_fr: "🇫🇷",
  group_icon_es: "🇪🇸",
  group_icon_it: "🇮🇹",
  group_icon_en: "🏴",
  group_icon_pirate: "🏴‍☠️",
  group_icon_fire: "🔥",
};

/** Displayed title text by group_title item key. */
export const GROUP_TITLE: Record<string, string> = {
  group_title_squad: "Squad",
  group_title_dynasty: "Dynastie",
  group_title_legends: "Légendes",
};

export function groupBg(key: string | null | undefined): string {
  return (key && GROUP_BG[key]) || "";
}
export function groupIcon(key: string | null | undefined): string {
  return (key && GROUP_ICON[key]) || "";
}
export function groupTitle(key: string | null | undefined): string {
  return (key && GROUP_TITLE[key]) || "";
}
