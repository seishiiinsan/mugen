import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const redirectTo = typeof sp.redirect === "string" ? sp.redirect : "/matchs";
  const authError = sp.error === "auth";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <Link
        href="/"
        className="text-center text-3xl font-bold tracking-tight"
      >
        Mugen
      </Link>

      {!isSupabaseConfigured() ? (
        <div className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
          L&apos;authentification n&apos;est pas encore configurée. Renseignez{" "}
          <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
          <code className="text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          dans <code className="text-foreground">.env.local</code>.
        </div>
      ) : (
        <LoginForm redirectTo={redirectTo} authError={authError} />
      )}
    </div>
  );
}
