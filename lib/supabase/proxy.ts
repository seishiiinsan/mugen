import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * App sections that require an authenticated user. Keep this in sync with the
 * `app/(app)` route group: every page there assumes a logged-in user, so a
 * missing prefix lets anonymous visitors reach confusing empty states (e.g.
 * `/joueur/[username]`, which doesn't redirect on its own).
 */
const PROTECTED_PREFIXES = [
  "/amis",
  "/boutique",
  "/classement",
  "/groupes",
  "/joueur",
  "/matchs",
  "/mes-pronostics",
  "/profil",
  "/signaler",
  "/succes",
];

/**
 * Refreshes the Supabase auth session on every matched request and enforces
 * coarse-grained route protection. Called from the root `proxy.ts` (the Next 16
 * rename of `middleware.ts`). No-ops when Supabase isn't configured, so the app
 * still runs on mock data in local dev.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/matchs";
    return NextResponse.redirect(url);
  }

  return response;
}
