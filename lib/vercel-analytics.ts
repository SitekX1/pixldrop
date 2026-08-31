const TEAM_ID = "team_HfcirRqfpAuGPplHmoDzJpWk";
const PROJECT_ID = "prj_EhBlFv1avjEgfVUwsCER1wAXpk1c";

export type EventCounts = Record<string, number>;

export type AnalyticsSnapshot = {
  visitors7d: number | null;
  pageviews7d: number | null;
  visitors30d: number | null;
  pageviews30d: number | null;
  events30d: EventCounts | null;
  eventsUnavailableReason: string | null;
  error: string | null;
};

const TRACKED_EVENTS = [
  "social-click",
  "spotify-embed-load",
  "spotify-artist-click",
  "aicut-click",
];

class VercelApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function vercelFetch(path: string, params: Record<string, string>) {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new VercelApiError("VERCEL_API_TOKEN missing", 0);

  const search = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params });
  const res = await fetch(`https://api.vercel.com/v1/query/web-analytics/${path}?${search}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new VercelApiError(`${path} failed: ${res.status} ${await res.text()}`, res.status);
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

  let visits7d: { data?: { visitors?: number; pageviews?: number } } | null = null;
  let visits30d: { data?: { visitors?: number; pageviews?: number } } | null = null;
  let visitsError: string | null = null;

  try {
    [visits7d, visits30d] = await Promise.all([
      vercelFetch("visits/count", { since: daysAgoIso(7), until: nowIso }),
      vercelFetch("visits/count", { since: daysAgoIso(30), until: nowIso }),
    ]);
  } catch (err) {
    visitsError = err instanceof Error ? err.message : "Unknown error";
  }

  let events30d: EventCounts | null = null;
  let eventsUnavailableReason: string | null = null;

  try {
    const eventResults = await Promise.all(
      TRACKED_EVENTS.map((eventName) =>
        vercelFetch("events/count", {
          since: daysAgoIso(30),
          until: nowIso,
          filter: `eventName eq '${eventName}'`,
        })
      )
    );
    events30d = {};
    TRACKED_EVENTS.forEach((name, i) => {
      events30d![name] = eventResults[i]?.data?.count ?? 0;
    });
  } catch (err) {
    if (err instanceof VercelApiError && err.status === 402) {
      eventsUnavailableReason = "Klick-Events benötigen einen bezahlten Vercel-Plan (Pro/Enterprise).";
    } else {
      eventsUnavailableReason = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return {
    visitors7d: visits7d?.data?.visitors ?? null,
    pageviews7d: visits7d?.data?.pageviews ?? null,
    visitors30d: visits30d?.data?.visitors ?? null,
    pageviews30d: visits30d?.data?.pageviews ?? null,
    events30d,
    eventsUnavailableReason,
    error: visitsError,
  };
}

export const EVENT_LABELS: Record<string, string> = {
  "social-click": "Social-Klicks",
  "spotify-embed-load": "Spotify-Player geladen",
  "spotify-artist-click": "Spotify-Profil-Klicks",
  "aicut-click": "aicut-Klicks",
};
