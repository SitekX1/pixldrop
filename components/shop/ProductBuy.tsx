"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Produkt } from "@/lib/shop/produkte";
import type { Farbe } from "@/lib/shop/farben";
import { SCHRIFTEN, unerlaubteZeichen } from "@/lib/shop/schriften";
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
  const pers = produkt.personalisierung;
  const [farbeId, setFarbeId] = useState<string | null>(farben[0]?.id ?? null);
  const [opt, setOpt] = useState<Record<string, string>>(() =>
    Object.fromEntries(produkt.optionen.map((g) => [g.id, g.optionen[0].id])),
  );
  const [mitText, setMitText] = useState(!!produkt.nurMitText);
  const [text, setText] = useState("");
  const [schriftId, setSchriftId] = useState(SCHRIFTEN[0].id);
  const [menge, setMenge] = useState(1);
  const [fehler, setFehler] = useState<string | null>(null);
  const [stickyZeigen, setStickyZeigen] = useState(false);
  const aktion = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = aktion.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStickyZeigen(!e.isIntersecting && e.boundingClientRect.bottom < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const farbe = farben.find((f) => f.id === farbeId);
  const schlecht = pers && mitText ? unerlaubteZeichen(text) : [];
  const textFehler =
    pers && mitText
      ? schlecht.length
        ? `Diese Zeichen kann ich nicht drucken: ${schlecht.join(" ")}  Erlaubt sind Buchstaben, Umlaute, ß, Ziffern und . , ! ? & - '`
        : produkt.nurMitText && text.trim() === ""
          ? "Bitte gib deinen Text ein, zum Beispiel „" + pers.beispiel + "“."
          : null
      : null;
  const nahLimit = pers ? text.length >= pers.maxLaenge - 3 : false;

  function weiter() {
    if (textFehler) {
      setFehler(textFehler);
      textRef.current?.focus();
      return;
    }
    setFehler(null);
    speichereAuswahl({
      slug: produkt.slug,
      farbeId,
      optionen: opt,
      text: pers && mitText ? text.trim() : "",
      schriftId: pers && mitText ? schriftId : null,
      menge,
    });
    router.push("/3d-druck/bestellung?schritt=1");
  }

  const knopf = bestellbar ? (
    <button type="button" className="shop-btn" onClick={weiter}>Weiter zur Bestellung</button>
  ) : (
    <button type="button" className="shop-btn" aria-disabled="true">Kommt zum Verkauf</button>
  );

  return (
    <>
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

      {/* Personalisierung */}
      {pers && (
        <div className="shop-personal-box">
          {!produkt.nurMitText && (
            <label className="shop-check">
              <input type="checkbox" checked={mitText} onChange={(e) => setMitText(e.target.checked)} />
              <span>Mit eigenem Text (Aufpreis folgt)</span>
            </label>
          )}
          {mitText && (
            <>
              <div className="shop-field">
                <label htmlFor="wunschtext">{pers.label} <span className="opt">(Pflicht)</span></label>
                <input
                  id="wunschtext" ref={textRef} className="shop-input" type="text" inputMode="text" autoComplete="off" spellCheck={false}
                  maxLength={pers.maxLaenge + 12} value={text} onChange={(e) => { setText(e.target.value); setFehler(null); }}
                  placeholder={`z. B. ${pers.beispiel}…`}
                  aria-invalid={!!textFehler && (schlecht.length > 0 || fehler !== null)} aria-describedby="wunschtext-info"
                  style={{ fontFamily: SCHRIFTEN.find((s) => s.id === schriftId)?.family }}
                />
                <div id="wunschtext-info" style={{ display: "grid", gap: 4 }}>
                  <span className="shop-counter" aria-live={nahLimit ? "polite" : "off"}>{text.length} / {pers.maxLaenge}</span>
                  {text.length > pers.maxLaenge && <span className="shop-err" role="alert">Bitte höchstens {pers.maxLaenge} Zeichen.</span>}
                  {schlecht.length > 0 && <span className="shop-err" role="alert">{textFehler}</span>}
                  {fehler && schlecht.length === 0 && <span className="shop-err" role="alert">{fehler}</span>}
                </div>
              </div>
              <fieldset>
                <legend>Schrift</legend>
                <div className="shop-fonts">
                  {SCHRIFTEN.map((s) => (
                    <label key={s.id} className="shop-font">
                      <input type="radio" name="schrift" value={s.id} checked={schriftId === s.id} onChange={() => setSchriftId(s.id)} />
                      <span style={{ fontFamily: s.family }}>
                        {text.trim() || "Montag"}
                        <small style={{ fontFamily: "var(--shop-display)" }}> {s.name}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="shop-preview">Vorschau folgt (3D-Ansicht mit deinem Text)</div>
              {text.trim() !== "" && <p className="shop-note shop-note--warn">{TEXTE.widerrufAusschluss}</p>}
              <p className="muted">Keine Marken, Namen Dritter oder verbotene Zeichen. Ich darf Texte ablehnen.</p>
            </>
          )}
        </div>
      )}

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
