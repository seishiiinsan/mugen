import { NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { fetchScorers, isSportsApiConfigured } from "@/lib/sports";
import { scoreScorers } from "@/lib/domain/markets";
import { grantAchievements } from "@/lib/economy";
import type { ScorerPick } from "@/lib/domain/types";

// Retroactive achievement backfill. Two steps:
//   A. recompute predictions.scorer_hits for already-settled predictions whose
//      goalscorers were never graded (settled before the column existed), by
//      re-fetching each match's real scorers from the API;
//   B. re-scan every player so any achievement they already qualify for —
//      including the new themed ones — gets granted (badge + XP, no coins).
//
// This is the reusable "scan the DB" mechanism: run it once after shipping a
// new wave of achievements. Idempotent and resumable (step A only touches rows
// with scorer_hits still null, so re-running drains the backlog in batches).
//
// Guarded like /api/settle: Authorization: Bearer <CRON_SECRET> or ?key=.

const SCORER_BATCH = 2000;
const PROFILE_PAGE = 1000;

interface PendingRow {
  id: string;
  fixture_id: number;
  scorers: ScorerPick[] | null;
}

async function recomputeScorerHits(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  if (!isSportsApiConfigured()) return 0;

  const { data } = await admin
    .from("predictions")
    .select("id, fixture_id, scorers")
    .not("points", "is", null)
    .is("scorer_hits", null)
    .neq("scorers", "[]")
    .limit(SCORER_BATCH);

  const rows = (data as PendingRow[] | null) ?? [];
  if (rows.length === 0) return 0;

  // Fetch each fixture's real scorers once, then grade every pick against it.
  const fixtureIds = [...new Set(rows.map((r) => r.fixture_id))];
  const scorersByFixture = new Map<number, { ids: number[]; names: string[] }>();
  await Promise.all(
    fixtureIds.map(async (fid) => {
      scorersByFixture.set(fid, await fetchScorers(fid));
    }),
  );

  let updated = 0;
  for (const r of rows) {
    const actual = scorersByFixture.get(r.fixture_id) ?? { ids: [], names: [] };
    const picks = r.scorers ?? [];
    const hits = picks.length
      ? scoreScorers(picks, {
          score: { home: 0, away: 0 }, // unused by hit detection
          scorerIds: actual.ids,
          scorerNames: actual.names,
        }).hits
      : 0;
    await admin.from("predictions").update({ scorer_hits: hits }).eq("id", r.id);
    updated++;
  }
  return updated;
}

async function rescanAchievements(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  let scanned = 0;
  for (let page = 0; ; page++) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .range(page * PROFILE_PAGE, (page + 1) * PROFILE_PAGE - 1);
    const ids = ((data as { id: string }[] | null) ?? []).map((r) => r.id);
    if (ids.length === 0) break;
    for (const id of ids) {
      await grantAchievements(admin, id, { awardCoins: false });
      scanned++;
    }
    if (ids.length < PROFILE_PAGE) break;
  }
  return scanned;
}

async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("key") ??
    "";

  if (secret) {
    if (provided !== secret) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return new NextResponse("CRON_SECRET is not set", { status: 500 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ scorersRecomputed: 0, usersScanned: 0 });
  }

  const admin = createAdminClient();
  const scorersRecomputed = await recomputeScorerHits(admin);
  const usersScanned = await rescanAchievements(admin);

  return NextResponse.json({ scorersRecomputed, usersScanned });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
