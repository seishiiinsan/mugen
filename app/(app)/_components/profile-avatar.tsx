"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "./user-avatar";

export function ProfileAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const active = pathname === "/profil" || pathname.startsWith("/profil/");

  return (
    <Link
      href="/profil"
      aria-label="Profil"
      aria-current={active ? "page" : undefined}
      className={`block rounded-full transition-colors ${
        active ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""
      }`}
    >
      <UserAvatar
        username={username}
        avatarUrl={avatarUrl}
        sizes="32px"
        className={`size-8 rounded-full border text-sm font-semibold ${
          active
            ? "border-accent bg-accent/10 text-accent"
            : "border-border bg-surface-2 text-foreground hover:border-border-strong"
        }`}
      />
    </Link>
  );
}
