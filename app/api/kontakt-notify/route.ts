import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Allgemeines Kontaktformular im Impressum (zweiter schneller Direktkontakt-Kanal
// neben der E-Mail-Adresse, § 5 DDG). Verschickt die Nachricht per SMTP über die
// eigene IONOS-Mailbox as@sitekx.de — gleiches Vorgehen wie bei sitekx-next
// (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS), bewusst kein externer Mail-Drittanbieter.
// Ohne die Env-Vars wird der Versand übersprungen statt das Formular scheitern zu
// lassen, damit ein fehlendes Setup nicht als kaputte Seite erscheint (Fallback-
// Mailadresse steht daneben im UI).

const MAX_LENGTHS: Record<string, number> = {
  name: 100,
  email: 200,
  message: 2000,
};

// Gleiches einfaches In-Memory-Drosselmuster wie /api/gruss-notify — kein
// vollwertiges Rate-Limiting über mehrere Serverless-Instanzen hinweg, bremst
// aber triviales Dauerfeuer spürbar aus.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

function clean(value: unknown, field: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_LENGTHS[field]);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
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
  const email = clean(raw.email, "email");
  const message = clean(raw.message, "message");

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }
  // Groben Format-Check, keine vollständige RFC-Validierung nötig — die eigentliche
  // Zustellung/Antwort läuft ohnehin manuell per E-Mail-Client.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json({ error: "Kontaktformular ist noch nicht eingerichtet" }, { status: 503 });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: `"PixlDrop Kontakt" <${SMTP_USER}>`,
      to: SMTP_USER,
      replyTo: email,
      subject: `Neue Kontaktanfrage von ${name}`,
      text: `Name: ${name}\nE-Mail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>E-Mail:</strong> ${escapeHtml(email)}</p><p><strong>Nachricht:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
    });
  } catch (err) {
    console.error("Kontaktformular Mail-Fehler:", err);
    return NextResponse.json({ error: "Versand fehlgeschlagen" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
