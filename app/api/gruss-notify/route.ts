import { NextResponse } from "next/server";

// Benachrichtigt Alex per Telegram über eine neue Grußvideo-Anfrage.
// Braucht TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID als Env-Vars (Vercel) —
// ohne die wird der Aufruf einfach übersprungen, statt die Bestellung
// scheitern zu lassen (die Anfrage steht ja schon sicher in Supabase).

const MAX_LENGTHS: Record<string, number> = {
  name: 100,
  contact: 200,
  occasion: 60,
  tone: 100,
  message: 1000,
  textMode: 20,
};

// Einfache Drosselung pro IP. Bewusst nur In-Memory: das hält sich nicht über
// mehrere Serverless-Instanzen hinweg und ist deshalb kein vollwertiger Schutz,
// bremst aber triviales Dauerfeuer auf den Telegram-Chat spürbar aus. Für echtes
// Rate-Limiting bräuchte es einen geteilten Speicher (z.B. eine Supabase-Tabelle).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(ip, recent);
  // Verhindert unbegrenztes Wachsen der Map bei vielen verschiedenen IPs.
  if (hits.size > 5000) hits.clear();
  return false;
}

function clean(value: unknown, field: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_LENGTHS[field]);
}

export async function POST(request: Request) {
  // Drosselung und Validierung laufen bewusst VOR der Env-Var-Prüfung: sonst
  // würde die Route bei fehlenden Telegram-Zugangsdaten jede beliebige Anfrage
  // ungeprüft mit 200 quittieren und ließe sich nicht sinnvoll testen.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = clean(raw.name, "name");
  const contact = clean(raw.contact, "contact");
  const occasion = clean(raw.occasion, "occasion");
  const tone = clean(raw.tone, "tone");
  const message = clean(raw.message, "message");
  const textMode = clean(raw.textMode, "textMode");

  if (!name || !contact || !occasion || !tone) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return NextResponse.json({ skipped: true }, { status: 200 });
  }

  const text = [
    "🎬 Neue Grußvideo-Anfrage!",
    `Name: ${name}`,
    `Kontakt: ${contact}`,
    `Anlass: ${occasion}`,
    `Variante: ${tone}`,
    textMode ? `Text-Modus: ${textMode === "exact_text" ? "genauer Text vorgegeben" : "nur Stichpunkte"}` : null,
    message ? `Nachricht: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    // Nicht kritisch für den Bestellprozess — die Anfrage ist bereits gespeichert.
    return NextResponse.json({ telegramError: true }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
