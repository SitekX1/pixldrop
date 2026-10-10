"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { istIndividuell, type Produkt } from "@/lib/shop/produkte";
import { formatAnzeigeAusOptionen } from "@/lib/shop/textformat";
import type { Farbe } from "@/lib/shop/farben";
import { aendereMenge, entferne, ladeKorb, speichereKorb, zwischensummeCent, type Korb } from "@/lib/shop/auswahl";
import { TEXTE, VERSAND_CENT, formatPreis } from "@/lib/shop/config";
import PositionsBild from "./PositionsBild";

// Warenkorb: Positionen mit Menge ändern / entfernen, Summe, Hinweis zum Widerruf, "Zur Kasse".
export default function Warenkorb({ produkte, farben, wunschtextPausiert = false }: { produkte: Produkt[]; farben: Farbe[]; wunschtextPausiert?: boolean }) {
  const [korb, setKorb] = useState<Korb>([]);
  const [geladen, setGeladen] = useState(false);
  const [meldung, setMeldung] = useState("");

  useEffect(() => { setKorb(ladeKorb()); setGeladen(true); }, []);
  const setze = (k: Korb) => { setKorb(k); speichereKorb(k); };

  if (!geladen) return <div className="shop-skeleton" style={{ aspectRatio: "16 / 9" }} aria-busy="true" aria-label="Wird geladen" />;
  if (korb.length === 0) {
    return (
      <div className="shop-empty" role="status">
        {meldung && <p className="shop-demo">{meldung}</p>}
        <h2>Dein Warenkorb ist noch leer.</h2>
        <p>Such dir ein Stück aus, dann landet es hier.</p>
        <Link className="shop-btn" href="/3d-druck#stuecke">Alle Stücke ansehen</Link>
      </div>
    );
  }

  const von = (slug: string) => produkte.find((p) => p.slug === slug);
  const gesperrtPos = (slug: string) => wunschtextPausiert && !!von(slug)?.personalisierung;
  const gesperrtNamen = [...new Set(korb.flatMap((a) => (gesperrtPos(a.slug) ? [von(a.slug)!.name] : [])))];
  const fehlt = korb.some((a) => !von(a.slug)) || gesperrtNamen.length > 0;
  const zwischen = zwischensummeCent(korb, (s) => von(s)?.preisCent);
  const gesamt = zwischen != null ? zwischen + (VERSAND_CENT ?? 0) : null;
  const ausgenommen = korb.flatMap((a) => { const p = von(a.slug); return p && istIndividuell(p, a.text, a.optionen) ? [p.name] : []; });

  return (
    <div className="shop-zwei">
      <div className="shop-zwei-l">
      <p className="sr-only" role="status" aria-live="polite">{meldung}</p>
      <ul className="shop-cart" aria-label="Positionen im Warenkorb">
        {korb.map((a, i) => {
          const p = von(a.slug);
          if (!p) {
            return (
              <li key={i} className="shop-cart-item">
                <div style={{ display: "grid", gap: 6 }}>
                  <strong>Dieser Artikel ist nicht mehr verfügbar.</strong>
                  <button type="button" className="shop-btn shop-btn--small shop-btn--ghost" onClick={() => setze(entferne(korb, i))}>Entfernen</button>
                </div>
              </li>
            );
          }
          const farbe = farben.find((f) => f.id === a.farbeId);
          const opt = [
            ...p.optionen.map((g) => `${g.label}: ${g.optionen.find((o) => o.id === a.optionen[g.id])?.label ?? ""}`),
            ...formatAnzeigeAusOptionen(p.personalisierung, a.optionen).map(([k, v]) => `${k}: ${v}`),
          ];
          const ind = istIndividuell(p, a.text, a.optionen);
          return (
            <li key={`${a.slug}-${i}`} className="shop-cart-item">
              <div className="shop-cart-img"><PositionsBild p={p} a={a} farbeHex={farbe?.hex} /></div>
              <div className="shop-cart-body">
                <h2><Link href={`/3d-druck/${p.slug}`}>{p.name}</Link></h2>
                {farbe && <p className="muted">Farbe: {farbe.name}</p>}
                {opt.map((t) => <p key={t} className="muted">{t}</p>)}
                {a.text && <p className="muted">Wunschtext: „{a.text.split("\n").join(" / ")}“</p>}
                {gesperrtPos(a.slug) && <p className="shop-cart-gesperrt" role="note">Vorübergehend nicht bestellbar: Artikel mit Wunschtext sind aktuell pausiert. Bitte entferne diesen Artikel, um zur Kasse zu gehen.</p>}
                {ind && <p className="shop-cart-flag">Vom Widerruf ausgenommen (nach deinen Vorgaben gefertigt)</p>}
                <div className="shop-cart-row">
                  <div className="shop-stepper">
                    <button type="button" aria-label={`Menge von ${p.name} verringern`} onClick={() => setze(aendereMenge(korb, i, a.menge - 1))}>−</button>
                    <input className="shop-input" type="number" inputMode="numeric" min={1} max={20} value={a.menge} aria-label={`Menge ${p.name}`}
                      onChange={(e) => setze(aendereMenge(korb, i, Number(e.target.value) || 1))} />
                    <button type="button" aria-label={`Menge von ${p.name} erhöhen`} onClick={() => setze(aendereMenge(korb, i, a.menge + 1))}>+</button>
                  </div>
                  <span className="shop-price-small">{p.preisCent != null ? formatPreis(p.preisCent * a.menge) : TEXTE.preisFolgt}</span>
                </div>
                <button type="button" className="shop-link shop-cart-remove" onClick={() => { setze(entferne(korb, i)); setMeldung(`${p.name} wurde entfernt.`); }}>
                  Entfernen<span className="sr-only">: {p.name}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      </div>

      <aside className="shop-zwei-r shop-form" aria-label="Zusammenfassung">
      <dl className="shop-cart-sum">
        <div><dt>Zwischensumme</dt><dd>{zwischen != null ? formatPreis(zwischen) : "auf Anfrage"}</dd></div>
        <div><dt>Versand (Deutschland)</dt><dd>{VERSAND_CENT != null ? formatPreis(VERSAND_CENT) : "auf Anfrage"}</dd></div>
        <div className="gesamt"><dt>Gesamt</dt><dd>{gesamt != null ? formatPreis(gesamt) : "auf Anfrage"}</dd></div>
      </dl>
      <p className="muted">{TEXTE.kleinunternehmer}</p>
      {ausgenommen.length > 0 && (
        <p className="shop-note shop-note--warn" role="note">
          <strong>Kein Widerrufsrecht bei:</strong> {ausgenommen.join(", ")} (mit deinem Wunschtext, nach deinen Vorgaben gefertigt, § 312g Abs. 2 Nr. 1 BGB). Das bestätigst du an der Kasse. Alle anderen Positionen: 14 Tage Widerruf.
        </p>
      )}
      {gesperrtNamen.length > 0 && <p className="shop-cart-gesperrt" role="status">Zur Kasse geht es erst, wenn du entfernt hast: {gesperrtNamen.join(", ")}.</p>}
      <div className="shop-actions" style={{ marginTop: 0 }}>
        {fehlt ? (
          <button type="button" className="shop-btn" aria-disabled="true">Zur Kasse</button>
        ) : (
          <Link className="shop-btn" href="/3d-druck/bestellung?schritt=2">Zur Kasse</Link>
        )}
        <Link className="shop-link" href="/3d-druck#stuecke">Weiter einkaufen</Link>
      </div>
      </aside>
    </div>
  );
}
