"use client";
import { useEffect } from "react";
import { speichereShopBereich } from "@/lib/shop/auswahl";

// Merkt sich, in welcher Shop-Übersicht der Besucher zuletzt war, damit "Weiter einkaufen" dorthin zurückführt.
export default function BereichMerker({ kategorie }: { kategorie: string }) {
  useEffect(() => { speichereShopBereich(kategorie); }, [kategorie]);
  return null;
}
