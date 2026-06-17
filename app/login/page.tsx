import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  CrownIcon,
  PredictionsIcon,
  RankingIcon,
} from "@/app/(app)/_components/icons";
import { LoginForm } from "./login-form";

const HIGHLIGHTS = [
  {
    Icon: PredictionsIcon,
    title: "Pronostiquez au score exact",
    text: "Chaque match, votre score pour des points.",
  },
  {
    Icon: RankingIcon,
    title: "Classement mondial mensuel",
    text: "Remis à zéro le 1er de chaque mois.",
  },
  {
    Icon: CrownIcon,
    title: "Le top 50 récompensé",
    text: "Gagnez des pièces, visez le podium et son badge exclusif.",
  },
];

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const redirectTo = typeof sp.redirect === "string" ? sp.redirect : "/matchs";
  const authError = sp.error === "auth";

  return (
    <div className="flex min-h-dvh">
      {/* Visual / brand side — blurred pitch photo under a light accent veil */}
      <aside className="relative hidden w-1/2 overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/auth-bg.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-110 object-cover blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-background/90 to-background/97" />

        {/* Floating score chips */}
        <div className="pointer-events-none absolute right-12 top-24 rotate-3 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm font-semibold tabular-nums">
          2 <span className="text-faint">-</span> 1
        </div>
        <div className="pointer-events-none absolute bottom-28 left-16 -rotate-2 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm font-semibold tabular-nums">
          0 <span className="text-faint">-</span> 0
        </div>

        <Link
          href="/"
          className="relative text-2xl font-bold tracking-tight"
        >
          Mugen
        </Link>

        <div className="relative max-w-sm">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Le score exact,
            <br />
            ça ne pardonne pas.
          </h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <Icon className="size-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-sm text-muted">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-faint">
          Pronostics football · {new Date().getFullYear()}
        </p>
      </aside>

      {/* Form side */}
      <main className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <Link
            href="/"
            className="block text-3xl font-bold tracking-tight lg:hidden"
          >
            Mugen
          </Link>

          {!isSupabaseConfigured() ? (
            <div className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
              L&apos;authentification n&apos;est pas encore configurée. Renseignez{" "}
              <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              et{" "}
              <code className="text-foreground">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              dans <code className="text-foreground">.env.local</code>.
            </div>
          ) : (
            <LoginForm redirectTo={redirectTo} authError={authError} />
          )}
        </div>
      </main>
    </div>
  );
}
