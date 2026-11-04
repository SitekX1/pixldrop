"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Mitternacht 3.11.2026 deutscher Zeit (CET = UTC+1). */
export const HALLOWEEN_KACHEL_ENDE_MS = Date.parse("2026-11-02T23:00:00Z");

// Blendet die Halloween-Kachel ab dem Enddatum aus, auch wenn die Seite als statisches HTML ausgeliefert wurde.
export default function NurBisHalloweenEnde({ children }: { children: ReactNode }) {
  const [vorbei, setVorbei] = useState(false);
  useEffect(() => {
    const rest = HALLOWEEN_KACHEL_ENDE_MS - Date.now();
    if (rest <= 0) { setVorbei(true); return; }
    if (rest > 2147483647) return;
    const t = setTimeout(() => setVorbei(true), rest);
    return () => clearTimeout(t);
  }, []);
  return vorbei ? null : <>{children}</>;
}
