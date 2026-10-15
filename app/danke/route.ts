import { NextResponse } from "next/server";

// Kurzadresse für den QR-Code auf der Dankeskarte im Paket (gedruckt, nicht mehr änderbar): pixldrop.de/danke.
// Das Ziel lässt sich hier jederzeit ändern (aktuell Shop-Startseite, später z. B. die Bewertungsseite).
// 307 = temporär, damit Browser und Suchmaschinen sich das Ziel nicht merken.
const ZIEL = "/3d-druck";

export function GET(req: Request) {
  return NextResponse.redirect(new URL(ZIEL, req.url), 307);
}
