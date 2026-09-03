import { createClient } from "@supabase/supabase-js";

export type ClickBreakdown = { eventName: string; detail: string; count: number };

export type ClickStats = {
  breakdown7d: ClickBreakdown[];
  breakdown30d: ClickBreakdown[];
  error: string | null;
};

function daysAgoIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export async function getClickStats(): Promise<ClickStats> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { breakdown7d: [], breakdown30d: [], error: "Supabase env vars missing" };
  }

  const supabase = createClient(url, key);

  try {
    const [r7, r30] = await Promise.all([
      supabase.rpc("pixldrop_click_breakdown", { since: daysAgoIso(7) }),
      supabase.rpc("pixldrop_click_breakdown", { since: daysAgoIso(30) }),
    ]);

    if (r7.error) throw r7.error;
    if (r30.error) throw r30.error;

    const map = (rows: any[]): ClickBreakdown[] =>
      (rows ?? []).map((r) => ({ eventName: r.event_name, detail: r.detail, count: Number(r.count) }));

    return { breakdown7d: map(r7.data), breakdown30d: map(r30.data), error: null };
  } catch (err) {
    return {
      breakdown7d: [],
      breakdown30d: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export type PixlgameLeaderboardEntry = { playerName: string; score: number; createdAt: string };

export async function getPixlgameLeaderboard(limit = 100): Promise<{
  entries: PixlgameLeaderboardEntry[];
  error: string | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { entries: [], error: "Supabase env vars missing" };
  }

  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase.rpc("pixldrop_top_scores", { p_limit: limit });
    if (error) throw error;
    const entries: PixlgameLeaderboardEntry[] = (data ?? []).map((r: any) => ({
      playerName: r.player_name,
      score: Number(r.score),
      createdAt: r.created_at,
    }));
    return { entries, error: null };
  } catch (err) {
    return { entries: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export const EVENT_LABELS: Record<string, string> = {
  "social-click": "Social-Klicks",
  "spotify-embed-load": "Spotify-Player geladen",
  "spotify-artist-click": "Spotify-Profil-Klicks",
  "aicut-click": "aicut-Klicks",
  "pixlgame-click": "Spiel-Klicks",
};
