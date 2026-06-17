"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { AdminPlayer, AdminPlayerDetail } from "@/lib/domain/types";
import { formatDate } from "@/lib/ui/format";
import { CoinIcon } from "@/app/(app)/_components/icons";
import { UserAvatar } from "@/app/(app)/_components/user-avatar";
import { loadPlayerDetail } from "../actions";

export function PlayersAdmin({ players }: { players: AdminPlayer[] }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? players.filter((p) => p.username.toLowerCase().includes(q)) : players;
  }, [players, query]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Joueurs</h1>
          <p className="text-sm text-muted">
            {players.length} compte{players.length > 1 ? "s" : ""} · clique pour
            le détail complet.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un pseudo…"
          className="w-56 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        />
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {filtered.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpenId(p.id)}
              className="press flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong"
            >
              <UserAvatar
                username={p.username}
                avatarUrl={p.avatarUrl}
                className="size-9 rounded-full border border-border bg-surface-2 text-sm font-semibold"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{p.username}</span>
                  {p.isAdmin && (
                    <span className="shrink-0 rounded bg-accent/10 px-1.5 text-[10px] font-bold text-accent">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-xs text-faint">
                  Inscrit le {formatDate(p.createdAt)}
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 font-mono text-sm font-semibold tabular-nums text-accent">
                <CoinIcon className="size-3.5" />
                {p.coins.toLocaleString("fr-FR")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Aucun joueur.
        </p>
      )}

      {openId && <PlayerModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function PlayerModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminPlayerDetail | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => setDetail(await loadPlayerDetail(id)));
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-[92vw] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl lg:w-2/3"
        onClick={(e) => e.stopPropagation()}
      >
        {pending && !detail ? (
          <p className="p-10 text-center text-sm text-faint">Chargement…</p>
        ) : !detail ? (
          <p className="p-10 text-center text-sm text-muted">
            Compte introuvable.
          </p>
        ) : (
          <DetailBody detail={detail} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function DetailBody({
  detail: d,
  onClose,
}: {
  detail: AdminPlayerDetail;
  onClose: () => void;
}) {
  return (
    <>
      {/* Sticky header */}
      <div className="flex items-center gap-3 border-b border-border p-5">
        <UserAvatar
          username={d.username}
          avatarUrl={d.avatar_url ?? undefined}
          className="size-12 rounded-full border border-border bg-surface-2 font-semibold"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{d.username}</h2>
            {d.is_admin && (
              <span className="rounded bg-accent/10 px-1.5 text-[10px] font-bold text-accent">
                ADMIN
              </span>
            )}
          </div>
          <p className="truncate font-mono text-xs text-faint">{d.id}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="press grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6 overflow-y-auto p-5">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Pièces" value={d.coins.toLocaleString("fr-FR")} />
          <Metric label="Niveau" value={String(d.level)} />
          <Metric label="XP totale" value={d.totalXp.toLocaleString("fr-FR")} />
          <Metric label="Points à vie" value={d.lifetime_points.toLocaleString("fr-FR")} />
          <Metric label="Pronostics" value={String(d.predictions_total)} />
          <Metric label="Réglés" value={String(d.predictions_settled)} />
          <Metric label="Scores exacts" value={String(d.exact_scores)} />
          <Metric label="Amis" value={String(d.friends_count)} />
        </div>

        <Section title="Compte">
          <Row k="Inscrit le" v={formatDate(d.created_at)} />
          <Row k="Visibilité pronos" v={d.predictions_visibility} />
          <Row k="Cadre équipé" v={d.equipped.frame ?? "—"} />
          <Row k="Titre équipé" v={d.equipped.title ?? "—"} />
          <Row k="Couleur équipée" v={d.equipped.color ?? "—"} />
          <Row k="Badge équipé" v={d.equipped.badge ?? "—"} />
        </Section>

        <Section title={`Succès (${d.achievements.length})`}>
          {d.achievements.length ? (
            <div className="flex flex-wrap gap-1.5">
              {d.achievements.map((k) => (
                <Chip key={k}>{k}</Chip>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Section>

        <Section title={`Inventaire (${d.items.length})`}>
          {d.items.length ? (
            <ul className="space-y-1">
              {d.items.map((it) => (
                <li
                  key={it.key}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">
                    {it.name}
                    {it.count > 1 && (
                      <span className="ml-1 font-mono text-accent">×{it.count}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-faint">
                    {it.kind} · {it.key}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>

        <Section title={`Signalements (${d.reports.length})`}>
          {d.reports.length ? (
            <ul className="space-y-1">
              {d.reports.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{r.title}</span>
                  <span className="shrink-0 font-mono text-xs text-faint">
                    {r.category} · {r.status} · {formatDate(r.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>

        <Section title={`Historique des pièces (${d.ledger.length})`}>
          {d.ledger.length ? (
            <ul className="space-y-1">
              {d.ledger.map((l, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate text-muted">
                    {l.reason}
                    {l.ref ? (
                      <span className="text-faint"> · {l.ref}</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        l.amount >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {l.amount >= 0 ? "+" : ""}
                      {l.amount}
                    </span>
                    <span className="font-mono text-xs text-faint">
                      {formatDate(l.created_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-xs text-faint">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="truncate font-mono text-xs">{v}</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">
      {children}
    </span>
  );
}

function Empty() {
  return <p className="text-sm text-faint">—</p>;
}
