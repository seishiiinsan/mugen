"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { NotificationItem } from "@/lib/domain/types";
import { openNotifications } from "../amis/actions";
import { RelationButton } from "../amis/_components/social-buttons";
import { BellIcon } from "./icons";
import { UserAvatar } from "./user-avatar";

function describe(n: NotificationItem): string {
  const who = n.actorUsername ?? "Un joueur";
  if (n.type === "gift") {
    return n.refLabel
      ? `${who} vous a offert « ${n.refLabel} ».`
      : `${who} vous a offert un cosmétique.`;
  }
  return n.type === "friend_accept"
    ? `${who} a accepté votre demande d'ami.`
    : `${who} vous a envoyé une demande d'ami.`;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      start(async () => {
        setItems(await openNotifications());
        setUnread(0);
      });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        className={`press relative grid size-8 place-items-center rounded-full border transition-colors ${
          open
            ? "border-accent bg-accent/10 text-accent"
            : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-foreground"
        }`}
      >
        <BellIcon className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-faint">
            Notifications
          </div>

          {pending && !items ? (
            <p className="p-6 text-center text-sm text-faint">Chargement…</p>
          ) : !items || items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">
              Aucune notification.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="flex items-start gap-2.5 p-3">
                  <Link
                    href={n.actorUsername ? `/joueur/${n.actorUsername}` : "#"}
                    onClick={() => setOpen(false)}
                    className="shrink-0"
                  >
                    <UserAvatar
                      username={n.actorUsername ?? "?"}
                      avatarUrl={n.actorAvatar}
                      className="size-8 rounded-full border border-border bg-surface-2 text-xs font-semibold"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{describe(n)}</p>
                    {n.type === "friend_request" && n.pending && n.actorId && (
                      <div className="mt-1.5">
                        <RelationButton
                          userId={n.actorId}
                          relation="pending_in"
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
