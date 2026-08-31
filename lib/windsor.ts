export type TikTokStats = {
  followers: number | null;
  likes: number | null;
  source: "live" | "fallback";
};

/**
 * VERIFY BEFORE RELYING ON THIS: the exact Windsor.ai REST endpoint/field
 * names were not confirmed against a live API key while this was built.
 * Best-effort based on Windsor's documented pattern
 * (https://connectors.windsor.ai/{connector}?api_key=...&fields=...).
 * Once WINDSOR_API_KEY is set in Vercel, call GET /api/tiktok-stats and
 * check Vercel's function logs for "windsor fetch failed" / "windsor fetch
 * error" if numbers don't show up — the fix is almost certainly just the
 * URL or field names here, nothing else in the app depends on the shape.
 */
export async function fetchTikTokStats(): Promise<TikTokStats> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    return { followers: null, likes: null, source: "fallback" };
  }

  const fields = "total_followers_count,total_likes";
  const url = `https://connectors.windsor.ai/tiktok_organic?api_key=${apiKey}&fields=${fields}&date_preset=last_1d`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error("windsor fetch failed", res.status, await res.text());
      return { followers: null, likes: null, source: "fallback" };
    }
    const json = await res.json();
    const row = Array.isArray(json?.data) ? json.data[0] : Array.isArray(json) ? json[0] : json;
    if (!row) return { followers: null, likes: null, source: "fallback" };

    const followers =
      row.total_followers_count ?? row.followers_count ?? row.daily_total_followers_count ?? null;
    const likes = row.total_likes ?? row.likes ?? null;

    return {
      followers: followers != null ? Number(followers) : null,
      likes: likes != null ? Number(likes) : null,
      source: followers != null || likes != null ? "live" : "fallback",
    };
  } catch (err) {
    console.error("windsor fetch error", err);
    return { followers: null, likes: null, source: "fallback" };
  }
}

export function formatCount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(n);
}
