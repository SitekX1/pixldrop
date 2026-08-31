const TEAM_ID = "team_HfcirRqfpAuGPplHmoDzJpWk";
const PROJECT_ID = "prj_EhBlFv1avjEgfVUwsCER1wAXpk1c";

export type EventCounts = Record<string, number>;

export type AnalyticsSnapshot = {
  visitors7d: number | null;
  pageviews7d: number | null;
  visitors30d: number | null;
  pageviews30d: number | null;
  events30d: EventCounts;
  error: string | null;
};

const TRACKED_EVENTS = [
  "social-click",
  "spotify-embed-load",
  "spotify-artist-click",
  "aicut-click",
];

async function vercelFetch(path: string, params: Record<string, string>) {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN missing");

  const search = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params });
  const res = await fetch(`https://api.vercel.com/v1/query/web-analytics/${path}?${search}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Vercel API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const nowIso = new Date().toISOString();

  try {
    const [visits7d, visits30d, ...eventResults] = await Promise.all([
      vercelFetch("visits/count", { since: daysAgoIso(7), until: nowIso }),
      vercelFetch("visits/count", { since: daysAgoIso(30), until: nowIso }),
      ...TRACKED_EVENTS.map((eventName) =>
        vercelFetch("events/count", {
          since: daysAgoIso(30),
          until: nowIso,
          filter: `eventName eq '${eventName}'`,
        })
      ),
    ]);

    const events30d: EventCounts = {};
    TRACKED_EVENTS.forEach((name, i) => {
      events30d[name] = eventResults[i]?.data?.count ?? 0;
    });

    return {
      visitors7d: visits7d?.data?.visitors ?? null,
      pageviews7d: visits7d?.data?.pageviews ?? null,
      visitors30d: visits30d?.data?.visitors ?? null,
      pageviews30d: visits30d?.data?.pageviews ?? null,
      events30d,
      error: null,
    };
  } catch (err) {
    return {
      visitors7d: null,
      pageviews7d: null,
      visitors30d: null,
      pageviews30d: null,
      events30d: {},
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export const EVENT_LABELS: Record<string, string> = {
  "social-click": "Social-Klicks",
  "spotify-embed-load": "Spotify-Player geladen",
  "spotify-artist-click": "Spotify-Profil-Klicks",
  "aicut-click": "aicut-Klicks",
};
