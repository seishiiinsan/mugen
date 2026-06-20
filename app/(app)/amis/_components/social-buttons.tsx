"use client";

import { useTransition } from "react";
import type { ActionResult, Relation } from "@/lib/domain/types";
import { CheckIcon, UserPlusIcon, XIcon } from "../../_components/icons";
import { useToast } from "../../_components/toast";
import {
  blockUser,
  cancelFriendRequest,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  unblockUser,
} from "../actions";

const PRIMARY =
  "press inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-60";
const SUBTLE =
  "press inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2 disabled:opacity-60";
const DANGER =
  "press inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-faint transition-colors hover:border-danger/40 hover:bg-danger/[0.06] hover:text-danger disabled:opacity-60";

/**
 * Relationship-aware action(s) for a player. Covers search results, the
 * requests list (pending_in / pending_out), and public profiles.
 */
export function RelationButton({
  userId,
  relation,
}: {
  userId: string;
  relation: Relation;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const act = (fn: () => Promise<ActionResult>) => () =>
    start(async () => {
      const r = await fn();
      toast({ type: r.ok ? "success" : "error", message: r.message });
    });

  if (relation === "self") return null;

  if (relation === "friends") {
    return (
      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
        Amis
      </span>
    );
  }

  if (relation === "pending_out") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={act(() => cancelFriendRequest(userId))}
        className={SUBTLE}
      >
        Annuler
      </button>
    );
  }

  if (relation === "pending_in") {
    return (
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={act(() => respondFriendRequest(userId, true))}
          className={PRIMARY}
        >
          <CheckIcon className="size-3.5" />
          Accepter
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={act(() => respondFriendRequest(userId, false))}
          className={DANGER}
          aria-label="Refuser"
        >
          <XIcon className="size-3.5" />
        </button>
      </span>
    );
  }

  // relation === "none"
  return (
    <button
      type="button"
      disabled={pending}
      onClick={act(() => sendFriendRequest(userId))}
      className={PRIMARY}
    >
      <UserPlusIcon className="size-3.5" />
      Ajouter
    </button>
  );
}

/** "Retirer" button for the accepted-friends list. */
export function RemoveButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await removeFriend(userId);
          toast({ type: r.ok ? "success" : "error", message: r.message });
        })
      }
      className={DANGER}
    >
      Retirer
    </button>
  );
}

/** "Bloquer" — confirms, then cuts every social tie with the player. */
export function BlockButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Bloquer ce joueur ? Votre amitié et vos demandes en cours seront supprimées.",
          )
        ) {
          return;
        }
        start(async () => {
          const r = await blockUser(userId);
          toast({ type: r.ok ? "success" : "error", message: r.message });
        });
      }}
      className={DANGER}
    >
      Bloquer
    </button>
  );
}

/** "Débloquer" — restores a blocked player (no social tie is re-created). */
export function UnblockButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await unblockUser(userId);
          toast({ type: r.ok ? "success" : "error", message: r.message });
        })
      }
      className={SUBTLE}
    >
      Débloquer
    </button>
  );
}
