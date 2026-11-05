"use client";
import { useEffect, useState } from "react";
import { ladeAktionscode, speichereAktionscode } from "@/lib/shop/auswahl";

// Aktionscode im Warenkorb: Prüfung über /api/shop/aktion (nur Vorschau), verbindlich rechnet der Server bei der Bestellung.
export interface AktionStand { code: string; prozent: number }

export function useAktionscode() {
  const [aktion, setAktion] = useState<AktionStand | null>(null);
  const [meldung, setMeldung] = useState("");
  const [laedt, setLaedt] = useState(false);

  const pruefe = async (roh: string, still = false): Promise<void> => {
    const code = roh.trim();
    if (!code) { if (!still) setMeldung("Bitte gib einen Code ein."); return; }
    setLaedt(true);
    try {
      const res = await fetch(`/api/shop/aktion?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; code?: string; prozent?: number; error?: string };
      if (j.ok && j.code && typeof j.prozent === "number") { setAktion({ code: j.code, prozent: j.prozent }); speichereAktionscode(j.code); setMeldung(""); }
      else { setAktion(null); speichereAktionscode(null); if (!still) setMeldung(j.error ?? "Der Code konnte nicht geprüft werden."); }
    } catch {
      if (!still) setMeldung("Der Code konnte gerade nicht geprüft werden. Bitte versuch es noch einmal.");
    } finally { setLaedt(false); }
  };
  useEffect(() => { const c = ladeAktionscode(); if (c) void pruefe(c, true); }, []);
  const loese = () => { setAktion(null); speichereAktionscode(null); setMeldung(""); };
  return { aktion, meldung, laedt, pruefe, loese };
}

export function AktionsCodeFeld({ stand }: { stand: ReturnType<typeof useAktionscode> }) {
  const [eingabe, setEingabe] = useState("");
  const { aktion, meldung, laedt, pruefe, loese } = stand;
  if (aktion) {
    return (
      <div className="shop-field" role="status">
        <span className="shop-label">Aktionscode</span>
        <p className="muted" style={{ margin: 0 }}>{aktion.code} eingelöst: {aktion.prozent} % auf den Warenwert (ohne Versand). <button type="button" className="shop-link" onClick={loese}>Entfernen</button></p>
      </div>
    );
  }
  return (
    <form className="shop-field" onSubmit={(e) => { e.preventDefault(); void pruefe(eingabe); }}>
      <label htmlFor="aktionscode">Aktionscode <span className="opt">(optional)</span></label>
      <div style={{ display: "flex", gap: 8 }}>
        <input id="aktionscode" className="shop-input" value={eingabe} onChange={(e) => setEingabe(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-describedby={meldung ? "aktionscode-meldung" : undefined} />
        <button type="submit" className="shop-btn shop-btn--ghost shop-btn--small" disabled={laedt}>Einlösen</button>
      </div>
      {meldung && <p id="aktionscode-meldung" className="shop-cart-gesperrt" role="alert" style={{ margin: 0 }}>{meldung}</p>}
    </form>
  );
}
