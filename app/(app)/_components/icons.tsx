// Line icons (stroke, currentColor) — replaces decorative emojis per MASTER.md.

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function CoinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
    </svg>
  );
}

export function GiftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v8h14v-8" />
      <path d="M12 8v12" />
      <path d="M12 8C12 8 11 4 8.5 4a2 2 0 0 0 0 4H12z" />
      <path d="M12 8C12 8 13 4 15.5 4a2 2 0 0 1 0 4H12z" />
    </svg>
  );
}

export function MatchesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l4.3 3.1-1.6 5h-5.4l-1.6-5L12 7.5z" />
    </svg>
  );
}

export function PredictionsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RankingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h2.5a1 1 0 0 1 1 1v.5a3 3 0 0 1-3 3M7 5H4.5a1 1 0 0 0-1 1v.5a3 3 0 0 0 3 3" />
      <path d="M12 13v3M9 20h6M10 20l.6-2.5h2.8L14 20" />
    </svg>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export function GroupsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 18a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 13.5a5.5 5.5 0 0 1 3 4.5" />
    </svg>
  );
}

export function ShopIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8h16l-1 4.5a3 3 0 0 1-3 2.5H8a3 3 0 0 1-3-2.5L4 8z" />
      <path d="M4 8l1.4-3.2A1 1 0 0 1 6.3 4h11.4a1 1 0 0 1 .9.8L20 8" />
      <path d="M9 19h6" />
    </svg>
  );
}

export function CrownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9l3.2 2.4L12 6l4.8 5.4L20 9l-1.3 8H5.3L4 9z" />
      <path d="M5.3 20h13.4" />
    </svg>
  );
}

export function BadgeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="9" r="6" />
      <path d="M9.5 9l1.7 1.7 3.3-3.4" />
      <path d="M8 14l-1.2 7 5.2-3 5.2 3L16 14" />
    </svg>
  );
}

export function SeasonIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2.5l2.59 5.25 5.79.84-4.19 4.08.99 5.76-5.18-2.72-5.18 2.72.99-5.76-4.19-4.08 5.79-.84z" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" />
      <path d="M10 16l-4-4 4-4" />
      <path d="M6 12h10" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function FriendsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M17 4.5a3 3 0 0 1 0 5.8" />
      <path d="M16.5 13.2a5.5 5.5 0 0 1 4 5.8" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6 1.5 6H4.5S6 14 6 9z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function UserPlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M18 8v6M21 11h-6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12.5l4 4 10-10" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.8-3.8" />
    </svg>
  );
}
