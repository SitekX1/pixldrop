// Rendert Rechtstexte aus Zeichenketten: [PLATZHALTER ...] (falls vorhanden) wird sichtbar markiert,
// **fett** wird hervorgehoben. Reiner Text, kein HTML aus Fremdquellen.
import type { ReactNode } from "react";

export function T({ children }: { children: string }) {
  const teile = children.split(/(\[PLATZHALTER[^\]]*\]|\*\*[^*]+\*\*)/g);
  return (
    <>
      {teile.map((t, i) =>
        t.startsWith("[PLATZHALTER") ? <mark key={i} className="shop-ph">{t}</mark>
        : t.startsWith("**") ? <strong key={i}>{t.slice(2, -2)}</strong>
        : <span key={i}>{t}</span>,
      )}
    </>
  );
}

export function Abschnitt({ titel, absaetze, children }: { titel: string; absaetze?: string[]; children?: ReactNode }) {
  return (
    <section className="shop-legal-sec">
      <h2 style={{ fontSize: "1.25rem" }}>{titel}</h2>
      {absaetze?.map((a) => <p key={a}><T>{a}</T></p>)}
      {children}
    </section>
  );
}
