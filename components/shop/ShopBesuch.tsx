"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackClick } from "@/lib/track";

// Anonyme Besuchszählung für den Shop (ohne Cookie, ohne IP, ohne Speicher im Browser):
// pro Seitenaufruf eine Zeile mit Seite und Herkunft (?quelle=… oder Referrer-Domain).
export default function ShopBesuch() {
  const pfad = usePathname();
  const zuletzt = useRef<string | null>(null);
  useEffect(() => {
    if (zuletzt.current === pfad) return;
    zuletzt.current = pfad;
    try {
      const q = new URLSearchParams(window.location.search);
      const param = (q.get("quelle") || q.get("utm_source") || "").slice(0, 40);
      let ref = "";
      try { ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch { /* ignorieren */ }
      const quelle = param || (ref && ref !== window.location.hostname.replace(/^www\./, "") ? ref : "direkt");
      void trackClick("shop-besuch", { seite: pfad, quelle });
    } catch { /* Zählung darf nie stören */ }
  }, [pfad]);
  return null;
}
