import Image from "next/image";

/**
 * Profile picture with a graceful initial fallback. The caller controls size,
 * ring/border and background via `className` (must establish the box size, e.g.
 * `size-8`); this component just fills it with the image or the initial.
 */
export function UserAvatar({
  username,
  avatarUrl,
  className = "",
  sizes = "40px",
}: {
  username: string;
  avatarUrl?: string | null;
  className?: string;
  sizes?: string;
}) {
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className}`}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
