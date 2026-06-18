import Image from "next/image";
import Link from "next/link";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { href: "/matchs", label: "Matchs" },
      { href: "/classement", label: "Classement" },
      { href: "/login", label: "Jouer" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { href: "/wiki", label: "Wiki" },
      { href: "/changelog", label: "Nouveautés" },
      { href: "/signaler", label: "Signaler un problème" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <Image
                src="/logo.png"
                alt=""
                width={28}
                height={28}
                className="shrink-0"
              />
              Mugen
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted">
              Pronostique le score exact, grimpe au classement mondial mensuel.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-faint sm:flex-row">
          <span>Pronostics football · {new Date().getFullYear()}</span>
          <span>Cosmétiques uniquement — aucun avantage en jeu.</span>
        </div>
      </div>
    </footer>
  );
}
