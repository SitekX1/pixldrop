import { NextResponse } from "next/server";

// Benachrichtigt Alex per Telegram über eine neue Grußvideo-Anfrage.
// Braucht TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID als Env-Vars (Vercel) —
// ohne die wird der Aufruf einfach übersprungen, statt die Bestellung
// scheitern zu lassen (die Anfrage steht ja schon sicher in Supabase).
export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json({ skipped: true }, { status: 200 });
  }

  const body = await request.json();
  const { name, contact, occasion, tone, message } = body as {
    name: string;
    contact: string;
    occasion: string;
    tone: string;
    message?: string;
  };

  const text = [
    "🎬 Neue Grußvideo-Anfrage!",
    `Name: ${name}`,
    `Kontakt: ${contact}`,
    `Anlass: ${occasion}`,
    `Ton: ${tone}`,
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
