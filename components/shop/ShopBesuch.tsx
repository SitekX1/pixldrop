"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Anonyme Besuchszählung für den Shop (ohne Cookie, ohne IP, ohne Speicher im Browser):
// pro Seitenaufruf eine Zeile mit Seite und Herkunft (?quelle=… oder Referrer-Domain);
// der Server ergänzt nur "bot ja/nein" und die Geräteklasse (app/api/shop/besuch).
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
      void fetch("/api/shop/besuch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seite: pfad, quelle }), keepalive: true }).catch(() => {});
    } catch { /* Zählung darf nie stören */ }
  }, [pfad]);
  return null;
}
