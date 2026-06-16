import type { FixtureStatus } from "@/lib/domain/types";

export const STATUS_LABELS: Record<FixtureStatus, string> = {
  upcoming: "À venir",
  live: "En cours",
  finished: "Terminé",
  cancelled: "Annulé",
  postponed: "Reporté",
};

export const STATUS_STYLES: Record<FixtureStatus, string> = {
  upcoming: "bg-surface-2 text-muted",
  live: "bg-danger/15 text-danger",
  finished: "bg-surface-2 text-muted",
  cancelled: "bg-surface-2 text-muted",
  postponed: "bg-surface-2 text-muted",
};

/** Localized short date+time for a kickoff (Europe/Paris). */
export function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

/** Short day label, e.g. "sam. 15 juin" (Europe/Paris). */
export function formatMatchDay(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

/** Long date, e.g. "15 juin 2026" (Europe/Paris). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}
