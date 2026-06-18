import type { Metadata } from "next";
import { getPublishedChangelog } from "@/lib/data";
import { formatDate } from "@/lib/ui/format";
import { Markdown } from "@/app/_components/markdown";
import { Reveal } from "../_landing/reveal";

export const metadata: Metadata = {
  title: "Nouveautés · Mugen",
  description: "Les dernières évolutions de Mugen, version par version.",
};

/** Anchor id for deep-linking / the version jump-index. */
function anchorFor(version: string | null | undefined, id: string): string {
  return version ? `v-${version.replace(/[^\w.-]/g, "-")}` : `entry-${id}`;
}

export default async function ChangelogPage() {
  const entries = await getPublishedChangelog();
  const versioned = entries.filter((e) => e.version);

  return (
    <div className="px-6 pb-20 pt-28 sm:pt-32">
      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="size-1.5 rounded-full bg-accent" />
          Journal des évolutions
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
          Nouveautés
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Ce qui change dans Mugen, version après version. Déplie une version
          pour en lire le détail.
        </p>
      </Reveal>

      {/* Version jump-index — quick access when the list gets long. */}
      {versioned.length > 1 && (
        <Reveal className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
          {versioned.map((e) => (
            <a
              key={e.id}
              href={`#${anchorFor(e.version, e.id)}`}
              className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-mono text-xs font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              {e.version}
            </a>
          ))}
        </Reveal>
      )}

      <div className="mx-auto mt-12 w-full max-w-2xl">
        {entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted">
            Rien à signaler pour l&apos;instant — reviens bientôt.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-8">
            {entries.map((e, i) => (
              <li
                key={e.id}
                id={anchorFor(e.version, e.id)}
                className="relative scroll-mt-28"
              >
                {/* Timeline node */}
                <span className="absolute -left-[33px] top-4 grid size-4 place-items-center rounded-full border-2 border-accent bg-background">
                  <span className="size-1.5 rounded-full bg-accent" />
                </span>

                <Reveal>
                  {/* Latest entry expanded; the rest collapse to a scannable header. */}
                  <details
                    open={i === 0}
                    className="group rounded-2xl border border-border bg-surface transition-colors open:border-accent/30 hover:border-border-strong open:hover:border-accent/30"
                  >
                    <summary className="flex cursor-pointer list-none items-start gap-3 p-5 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {e.version && (
                            <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-accent">
                              {e.version}
                            </span>
                          )}
                          <time className="text-xs font-medium uppercase tracking-wide text-faint">
                            {formatDate(e.createdAt)}
                          </time>
                        </div>
                        <h2 className="mt-2 text-xl font-bold tracking-tight">
                          {e.title}
                        </h2>
                      </div>
                      <span
                        aria-hidden
                        className="mt-1 shrink-0 text-2xl leading-none text-faint transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <div className="border-t border-border px-5 pb-5 pt-1">
                      <Markdown>{e.body}</Markdown>
                    </div>
                  </details>
                </Reveal>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
