"use client";
import { useEffect } from "react";
import { leereKorb } from "@/lib/shop/auswahl";
import { loescheBestellZwischenstand } from "@/lib/shop/client";

// Nach erfolgreicher Bestellung: Zwischenstand (Auswahl, Kundendaten, Idempotenz-Key) aus dem Tab löschen.
export default function BestellungAbschluss() {
  useEffect(() => { leereKorb(); loescheBestellZwischenstand(); }, []);
  return null;
}
