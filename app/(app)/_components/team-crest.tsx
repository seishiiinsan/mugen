import Image from "next/image";

/** Team/league crest with an initials fallback when no logo is available. */
export function TeamCrest({
  name,
  logoUrl,
  size = 22,
}: {
  name: string;
  logoUrl?: string;
  size?: number;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 object-contain"
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted"
    >
      {initials}
    </span>
  );
}
