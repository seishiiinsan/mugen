import type { Metadata } from "next";
import { getPublishedChangelog } from "@/lib/data";
import { formatDate } from "@/lib/ui/format";
import { Markdown } from "@/app/_components/markdown";
import { Reveal } from "../_landing/reveal";

export const metadata: Metadata = {
  title: "Nouveautés · Mugen",
  description: "Les dernières évolutions de Mugen, version par version.",
};

export default async function ChangelogPage() {
  const entries = await getPublishedChangelog();

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
          Ce qui change dans Mugen, version après version.
        </p>
      </Reveal>

      <div className="mx-auto mt-16 w-full max-w-2xl">
        {entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted">
            Rien à signaler pour l&apos;instant — reviens bientôt.
          </p>
        ) : (
          <ol className="relative space-y-10 border-l border-border pl-8">
            {entries.map((e) => (
              <li key={e.id} className="relative">
                {/* Timeline node */}
                <span className="absolute -left-[33px] top-1.5 grid size-4 place-items-center rounded-full border-2 border-accent bg-background">
                  <span className="size-1.5 rounded-full bg-accent" />
                </span>

                <Reveal>
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
                  <div className="mt-2">
                    <Markdown>{e.body}</Markdown>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
