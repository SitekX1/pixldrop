"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  client = createClient(url, key);
  return client;
}

export async function startGameSession(): Promise<string> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("pixldrop_game_sessions")
    .insert({})
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "could not start session");
  return data.id as string;
}

export type SubmitScoreResult = {
  id: number;
  player_name: string;
  score: number;
  created_at: string;
};

export async function submitScore(
  sessionId: string,
  playerName: string,
  score: number
): Promise<SubmitScoreResult> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("pixldrop_submit_score", {
    p_session_id: sessionId,
    p_player_name: playerName,
    p_score: score,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("no result from submit_score");
  return row as SubmitScoreResult;
}

export async function getScoreRank(score: number): Promise<number> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("pixldrop_score_rank", { p_score: score });
  if (error) throw new Error(error.message);
  return data as number;
}

export type TopScore = { player_name: string; score: number; created_at: string };

export async function fetchTopScores(limit = 20): Promise<TopScore[]> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("pixldrop_top_scores", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data as TopScore[]) ?? [];
}

// Lädt das clientseitig generierte Story-Bild hoch und gibt eine echte,
// dauerhafte HTTPS-URL zurück. Wichtig speziell für TikTok/Instagram-
// In-App-Browser: eine nur lokal im Browser-Speicher gehaltene blob:/data:-URL
// geht verloren, sobald der Nutzer über "Im Browser öffnen" die Seite in
// einem echten Browser neu lädt — eine echte URL übersteht das.
export async function uploadStoryImage(blob: Blob, fileName: string): Promise<string> {
  const supabase = getClient();
  const path = `${Date.now()}-${fileName}`;
  const { error } = await supabase.storage
    .from("pixlgame-story-images")
    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("pixlgame-story-images").getPublicUrl(path);
  return data.publicUrl;
}
