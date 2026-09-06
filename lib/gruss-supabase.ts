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

export type GrussLead = {
  name: string;
  contact: string;
  occasion: string;
  tone: string;
  message?: string;
  privateUseConsent: boolean;
  textMode: "exact_text" | "stichpunkte";
};

export async function submitGrussLead(lead: GrussLead): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("pixldrop_gruss_leads").insert({
    name: lead.name,
    contact: lead.contact,
    occasion: lead.occasion,
    tone: lead.tone,
    message: lead.message || null,
    private_use_consent: lead.privateUseConsent,
    text_mode: lead.textMode,
  });
  if (error) throw new Error(error.message);
}
