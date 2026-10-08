"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { istIndividuell, type Produkt } from "@/lib/shop/produkte";
import { SCHRIFTEN, unerlaubteZeichen } from "@/lib/shop/schriften";
import ProductImage from "./ProductImage";
import type { Farbe } from "@/lib/shop/farben";
import { TEXTE } from "@/lib/shop/config";
import { speichereAuswahl } from "@/lib/shop/auswahl";

function hell(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export default function ProductBuy({
  produkt, farben, bestellbar, preisText,
}: { produkt: Produkt; farben: Farbe[]; bestellbar: boolean; preisText: string }) {
  const router = useRouter();
  const [farbeId, setFarbeId] = useState<string | null>(farben[0]?.id ?? null);
  const [opt, setOpt] = useState<Record<string, string>>(() =>
    Object.fromEntries(produkt.optionen.map((g) => [g.id, g.optionen[0].id])),
  );
  const [menge, setMenge] = useState(1);
  const pers = produkt.personalisierung;
  const [zeilen, setZeilen] = useState<string[]>(() => (pers?.zeilen ? pers.zeilen.map((z) => z.standard) : pers ? [""] : []));
  const [schriftId, setSchriftId] = useState(pers?.festeSchrift ?? SCHRIFTEN[0].id);
  const [stickyZeigen, setStickyZeigen] = useState(false);
  const aktion = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = aktion.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStickyZeigen(!e.isIntersecting && e.boundingClientRect.bottom < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const farbe = farben.find((f) => f.id === farbeId);
  const schrift = SCHRIFTEN.find((s) => s.id === (pers?.festeSchrift ?? schriftId));
  const text = zeilen.map((z) => z.trim()).join("\n");
  const textFehler = !pers ? null
    : zeilen.some((z) => z.trim() === "") ? "Bitte fülle alle Textzeilen aus."
    : unerlaubteZeichen(zeilen.join("")).length > 0 ? `Nicht druckbare Zeichen: ${unerlaubteZeichen(zeilen.join("")).join(" ")}`
    : null;
  const individuell = istIndividuell(produkt, text);
  function weiter() {
    if (textFehler) { document.getElementById("t-fehler")?.scrollIntoView({ block: "center" }); return; }
    speichereAuswahl({
      slug: produkt.slug,
      farbeId,
      optionen: opt,
      text: pers ? text : "",
      schriftId: pers ? (pers.festeSchrift ?? schriftId) : null,
      menge,
    });
    router.push("/3d-druck/bestellung?schritt=1");
  }

  if (produkt.nurAnfrage) {
    return (
      <div className="shop-note" role="note">
        <strong>Nur auf Anfrage: {TEXTE.preisAnfrage}.</strong>
        <p>Diesen Artikel gibt es nicht im Warenkorb. Schick mir deine Wünsche (Text, Farbe, Menge) über „Individueller Druck“, du bekommst ein unverbindliches Angebot per E-Mail.</p>
        <p style={{ marginTop: 10 }}><Link className="shop-btn" href="/3d-druck/anfrage">Individuell anfragen</Link></p>
      </div>
    );
  }

  const knopf = bestellbar ? (
    <button type="button" className="shop-btn" onClick={weiter}>Weiter zur Bestellung</button>
  ) : (
    <button type="button" className="shop-btn" aria-disabled="true">Kommt zum Verkauf</button>
  );

  return (
    <>
      {pers && (
        <fieldset>
          <legend>{pers.label}</legend>
          <div className="shop-textvorschau">
            <ProductImage form={produkt.form} farbe={farbe?.hex ?? produkt.grundfarbe} text={text} family={schrift?.family} typ="Live-Vorschau" breit />
          </div>
          {pers.zeilen ? (
            pers.zeilen.map((z, i) => (
              <div className="shop-field" key={z.label}>
                <label htmlFor={`t-${i}`}>{z.label}</label>
                <input id={`t-${i}`} className="shop-input" type="text" maxLength={z.max} value={zeilen[i]} autoComplete="off" spellCheck={false}
                  aria-describedby={textFehler ? "t-fehler" : undefined} onChange={(e) => setZeilen(zeilen.map((x, k) => (k === i ? e.target.value : x)))} />
              </div>
            ))
          ) : (
            <div className="shop-field">
              <label htmlFor="t-0">{pers.label}</label>
              <input id="t-0" className="shop-input" type="text" maxLength={pers.maxLaenge} value={zeilen[0]} autoComplete="off" spellCheck={false}
                placeholder={`z. B. ${pers.beispiel}…`} aria-describedby={textFehler ? "t-fehler" : undefined} onChange={(e) => setZeilen([e.target.value])} />
            </div>
          )}
          {textFehler && <p id="t-fehler" className="shop-err" role="alert">{textFehler}</p>}
          {!pers.festeSchrift && (
            <div className="shop-field">
              <label htmlFor="t-schrift">Schrift</label>
              <select id="t-schrift" className="shop-input" value={schriftId} onChange={(e) => setSchriftId(e.target.value)}>
                {SCHRIFTEN.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <p className="muted">Erlaubt: Buchstaben, Zahlen und . , ! ? &amp; - &apos;. Ich prüfe den Text vor dem Druck; ist er unzulässig, erstatte ich den Betrag.</p>
          {individuell ? (
            <p className="shop-note shop-note--warn" role="note">Mit geändertem Text wird das Stück nach deinen Vorgaben gefertigt. Dafür besteht <strong>kein Widerrufsrecht</strong> (§ 312g Abs. 2 Nr. 1 BGB). Du bestätigst das vor der Bestellung.</p>
          ) : (
            <p className="muted">Unverändert bestellt ist es normale Standardware mit 14 Tagen Widerruf.</p>
          )}
          <p className="muted">Andere Schrift, Logo oder Bild? <Link className="shop-link" href="/3d-druck/anfrage">Individuell anfragen</Link></p>
        </fieldset>
      )}

      {/* Farbwahl */}
      {farben.length > 0 ? (
        <fieldset>
          <legend>Farbe</legend>
          <div className="shop-swatches">
            {farben.map((f) => (
              <label key={f.id} className="shop-swatch">
                <input type="radio" name="farbe" value={f.id} checked={farbeId === f.id} onChange={() => setFarbeId(f.id)} aria-label={f.name} />
                <span className="dot" style={{ background: f.hex }}>
                  <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" fill="none" stroke={hell(f.hex) ? "#2e1c0f" : "#fff"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </label>
            ))}
          </div>
          <p aria-live="polite" style={{ marginTop: 6 }}>
            <strong>Farbe: {farbe?.name}</strong> · auf Lager
          </p>
          <p className="muted">Nur Farben, die gerade im Regal liegen. Bildschirmfarben können leicht abweichen.</p>
        </fieldset>
      ) : (
        <div className="shop-note">
          <strong>Gerade keine Farbe auf Lager.</strong>
          <p><Link className="shop-link" href="/3d-druck/anfrage">Individuell anfragen</Link></p>
        </div>
      )}

      {produkt.optionen.map((g) => (
        <fieldset key={g.id}>
          <legend>{g.label}</legend>
          <div className="shop-options">
            {g.optionen.map((o) => (
              <label key={o.id} className="shop-option">
                <input type="radio" name={`opt-${g.id}`} value={o.id} checked={opt[g.id] === o.id} onChange={() => setOpt({ ...opt, [g.id]: o.id })} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {/* Menge + Aktion */}
      <div className="shop-field">
        <label htmlFor="menge">Menge</label>
        <div className="shop-stepper">
          <button type="button" aria-label="Menge verringern" onClick={() => setMenge(Math.max(1, menge - 1))}>−</button>
          <input id="menge" className="shop-input" type="number" inputMode="numeric" min={1} max={20} value={menge}
            onChange={(e) => setMenge(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
          <button type="button" aria-label="Menge erhöhen" onClick={() => setMenge(Math.min(20, menge + 1))}>+</button>
        </div>
      </div>
      <div ref={aktion}>{knopf}</div>
      {!bestellbar && <p className="muted">Dieser Artikel ist noch nicht bestellbar. Du kannst ihn dir schon ansehen.</p>}

      <div className="shop-sticky" data-show={stickyZeigen}>
        <span className="shop-price-small">{preisText}</span>
        {bestellbar ? <button type="button" className="shop-btn" onClick={weiter}>Weiter zur Bestellung</button> : <button type="button" className="shop-btn" aria-disabled="true">Kommt zum Verkauf</button>}
      </div>
    </>
  );
}
