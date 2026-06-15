"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProfileAvatar({ username }: { username: string }) {
  const pathname = usePathname();
  const active = pathname === "/profil" || pathname.startsWith("/profil/");
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href="/profil"
      aria-label="Profil"
      aria-current={active ? "page" : undefined}
      className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-surface-2 text-foreground hover:border-border-strong"
      }`}
    >
      {initial}
    </Link>
  );
}
