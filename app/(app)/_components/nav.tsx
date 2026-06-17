"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FriendsIcon,
  GroupsIcon,
  MatchesIcon,
  PredictionsIcon,
  RankingIcon,
  ShopIcon,
} from "./icons";

const TABS = [
  { href: "/matchs", label: "Matchs", Icon: MatchesIcon },
  { href: "/mes-pronostics", label: "Pronostics", Icon: PredictionsIcon },
  { href: "/classement", label: "Classement", Icon: RankingIcon },
  { href: "/groupes", label: "Groupes", Icon: GroupsIcon },
  { href: "/amis", label: "Amis", Icon: FriendsIcon },
  { href: "/boutique", label: "Boutique", Icon: ShopIcon },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="min-w-0">
      <ul className="flex items-center gap-0.5 overflow-x-auto">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
