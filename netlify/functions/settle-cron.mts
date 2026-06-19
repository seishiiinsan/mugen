// Netlify Scheduled Function — settles finished predictions hourly.
//
// Netlify does NOT read the `crons` block in vercel.json, so this is the
// Netlify-native equivalent: it pings the existing /api/settle route (which
// runs settlePredictions with the service-role client) on a schedule.
//
// Requires the same CRON_SECRET env var the route checks. `URL` is injected by
// Netlify and holds the site's primary URL.

const handler = async () => {
  const base = process.env.URL ?? process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("[settle-cron] missing URL or CRON_SECRET env var");
    return new Response("misconfigured", { status: 500 });
  }

  const res = await fetch(`${base}/api/settle`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`[settle-cron] ${res.status} ${body}`);
  return new Response(body, { status: res.status });
};

export default handler;

// Hourly, matching the original vercel.json schedule.
export const config = { schedule: "@hourly" };
