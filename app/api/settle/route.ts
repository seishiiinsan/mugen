import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { LEADERBOARD_TAG } from "@/lib/data";
import { settlePredictions } from "@/lib/settle";

// Settle finished predictions. Intended to be hit by a scheduler (e.g. Vercel
// Cron, which sends `Authorization: Bearer <CRON_SECRET>`). Also callable
// manually with `?key=<CRON_SECRET>`.
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

  const result = await settlePredictions();
  // Points changed → mark the cached leaderboards stale so the next render
  // refreshes them ("max" = stale-while-revalidate, the Next 16 default).
  if (result.predictionsUpdated > 0) {
    revalidateTag(LEADERBOARD_TAG, "max");
  }
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
