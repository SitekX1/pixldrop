"use client";

import { createClient } from "@supabase/supabase-js";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : null;

export function trackClick(eventName: string, eventData?: Record<string, string>) {
  if (!supabase) return;
  supabase
    .from("pixldrop_link_clicks")
    .insert({ event_name: eventName, event_data: eventData ?? null })
    .then(({ error }) => {
      if (error) console.error("trackClick failed", error);
    });
}
