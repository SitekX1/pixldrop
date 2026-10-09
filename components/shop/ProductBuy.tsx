"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { istIndividuell, type Produkt } from "@/lib/shop/produkte";
import { SCHRIFTEN, unerlaubteZeichen } from "@/lib/shop/schriften";
import ProductImage from "./ProductImage";
import { useVorschauSetzen } from "./Vorschau";
import type { Farbe } from "@/lib/shop/farben";
import { TEXTE } from "@/lib/shop/config";
import { pruefeWunschtext } from "@/lib/shop/textfilter";
import { fuegeHinzu, ladeKorb, speichereKorb } from "@/lib/shop/auswahl";

function hell(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export default function ProductBuy({
  produkt, farben, bestellbar, preisText,
}: { produkt: Produkt; farben: Farbe[]; bestellbar: boolean; preisText: string }) {
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
  const [hinzu, setHinzu] = useState<{ ok: boolean; menge: number } | null>(null);

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
  const filter = pers && !textFehler ? pruefeWunschtext(zeilen) : { ok: true as const };
  const [filterZeigen, setFilterZeigen] = useState(false);
  const filterFehler = filterZeigen && !filter.ok ? filter.meldung : null;
  const gesperrt = !filter.ok;
  const beschreibung = [textFehler ? "t-fehler" : null, filterFehler ? "t-filter" : null].filter(Boolean).join(" ") || undefined;
  const individuell = istIndividuell(produkt, text);
  const setzeVorschau = useVorschauSetzen();
  const beispielText = (zeilen[0] ?? "").trim().slice(0, 9) || pers?.beispiel || "Abc";
  const vorFarbe = farbe?.hex ?? produkt.grundfarbe;
  const vorFamily = schrift?.family;
  useEffect(() => {
    setzeVorschau({ farbe: vorFarbe, text: pers ? text : undefined, family: vorFamily });
  }, [setzeVorschau, vorFarbe, text, vorFamily, pers]);
  function weiter() {
    if (textFehler) { document.getElementById("t-fehler")?.scrollIntoView({ block: "center" }); return; }
    if (gesperrt) {
      setFilterZeigen(true);
      requestAnimationFrame(() => document.getElementById("t-filter")?.scrollIntoView({ block: "center" }));
      return;
    }
    const r = fuegeHinzu(ladeKorb(), {
      slug: produkt.slug,
      farbeId,
      optionen: opt,
      text: pers ? text : "",
      schriftId: pers ? (pers.festeSchrift ?? schriftId) : null,
      menge,
    });
    if (r.ok) speichereKorb(r.korb);
    setHinzu({ ok: r.ok, menge });
    requestAnimationFrame(() => document.getElementById("hinzu")?.scrollIntoView({ block: "center", behavior: "smooth" }));
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
    <button type="button" className="shop-btn" aria-disabled={gesperrt || undefined} onClick={weiter}>In den Warenkorb</button>
  ) : (
    <button type="button" className="shop-btn" aria-disabled="true">Kommt zum Verkauf</button>
  );

  const widerruf = pers && individuell ? (
    <p className="shop-widerruf shop-widerruf--warn" role="note">Mit geändertem Text wird das Stück nach deinen Vorgaben gefertigt. Dafür besteht <strong>kein Widerrufsrecht</strong> (§ 312g Abs. 2 Nr. 1 BGB). Du bestätigst das vor der Bestellung.</p>
  ) : pers ? (
    <p className="shop-widerruf" role="note">Unverändert bestellt ist es Standardware mit 14 Tagen Widerruf.</p>
  ) : (
    <p className="shop-widerruf" role="note">Standardware mit 14 Tagen Widerruf.</p>
  );
  const aendereZeile = (i: number, v: string) => { setZeilen(zeilen.map((x, k) => (k === i ? v : x))); setFilterZeigen(true); };

  return (
    <div className="shop-buy">
      {pers && (
        <fieldset className="shop-step">
          <legend>{pers.label}</legend>
          <div className="shop-textvorschau">
            <ProductImage form={produkt.form} farbe={farbe?.hex ?? produkt.grundfarbe} text={text} family={schrift?.family} typ="Live-Vorschau" breit />
          </div>
          {pers.zeilen ? (
            pers.zeilen.map((z, i) => (
              <div className="shop-field" key={z.label}>
                <label htmlFor={`t-${i}`}>{z.label}</label>
                <input id={`t-${i}`} className="shop-input" type="text" maxLength={z.max} value={zeilen[i]} autoComplete="off" spellCheck={false}
                  aria-invalid={filterFehler ? true : undefined} aria-describedby={beschreibung} onBlur={() => setFilterZeigen(true)} onChange={(e) => aendereZeile(i, e.target.value)} />
              </div>
            ))
          ) : (
            <div className="shop-field">
              <label htmlFor="t-0">{pers.label}</label>
              <input id="t-0" className="shop-input" type="text" maxLength={pers.maxLaenge} value={zeilen[0]} autoComplete="off" spellCheck={false}
                placeholder={`z. B. ${pers.beispiel}…`} aria-invalid={filterFehler ? true : undefined} aria-describedby={beschreibung} onBlur={() => setFilterZeigen(true)} onChange={(e) => aendereZeile(0, e.target.value)} />
            </div>
          )}
          {textFehler && <p id="t-fehler" className="shop-err" role="alert">{textFehler}</p>}
          {filterFehler && (
            <p id="t-filter" className="shop-err" role="alert">
              <span>{filterFehler}<br /><Link className="shop-link" href="/3d-druck/anfrage">Individuell anfragen</Link></span>
            </p>
          )}
          <p className="muted">Erlaubt: Buchstaben, Zahlen und . , ! ? &amp; - &apos;. Der Text wird automatisch auf unzulässige Inhalte und Marken geprüft; im Zweifel hilft eine individuelle Anfrage. Bei geändertem Text prüfe ich ihn nach der Zahlung noch selbst, innerhalb von 24 Stunden; erst danach bekommst du die Bestellbestätigung. Lehne ich ihn ab, erstatte ich den vollen Betrag (AGB Ziffer 9 Abs. 3).</p>
          <p className="muted">Andere Schrift, Logo oder Bild? <Link className="shop-link" href="/3d-druck/anfrage">Individuell anfragen</Link></p>
        </fieldset>
      )}

      {pers && !pers.festeSchrift && (
        <fieldset className="shop-step shop-schriften">
          <legend>Schrift wählen</legend>
          <div className="shop-schriften-raster">
            {SCHRIFTEN.map((sf) => (
              <label key={sf.id} className="shop-schrift">
                <input type="radio" name="t-schrift" value={sf.id} checked={schriftId === sf.id} onChange={() => setSchriftId(sf.id)} />
                <span className="shop-schrift-bsp" style={{ fontFamily: sf.family }} aria-hidden="true">{beispielText}</span>
                <span className="shop-schrift-name">{sf.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Farbwahl */}
      {farben.length > 0 ? (
        <fieldset className="shop-step">
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
        <fieldset key={g.id} className="shop-step">
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
      <fieldset className="shop-step shop-step--menge">
        <legend>Menge</legend>
        <div className="shop-stepper">
          <button type="button" aria-label="Menge verringern" onClick={() => setMenge(Math.max(1, menge - 1))}>−</button>
          <input id="menge" className="shop-input" type="number" inputMode="numeric" min={1} max={20} value={menge} aria-label="Menge"
            onChange={(e) => setMenge(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
          <button type="button" aria-label="Menge erhöhen" onClick={() => setMenge(Math.min(20, menge + 1))}>+</button>
        </div>
      </fieldset>
      <div className="shop-kaufzeile">
        <div ref={aktion} className="shop-kaufknopf">{knopf}</div>
        {widerruf}
      </div>
      <div id="hinzu" role="status" aria-live="polite">
        {hinzu && (
          <div className={hinzu.ok ? "shop-note" : "shop-note shop-note--warn"} style={{ display: "grid", gap: 10 }}>
            {hinzu.ok ? (
              <strong>Hinzugefügt: {hinzu.menge} × {produkt.name}</strong>
            ) : (
              <strong>Der Warenkorb ist voll (höchstens 5 verschiedene Positionen). Bitte schließe zuerst die Bestellung ab oder entferne eine Position.</strong>
            )}
            <div className="shop-actions" style={{ marginTop: 0 }}>
              <Link className="shop-btn" href="/3d-druck/warenkorb">Zum Warenkorb</Link>
              <Link className="shop-btn shop-btn--ghost" href="/3d-druck#stuecke">Weiter einkaufen</Link>
            </div>
          </div>
        )}
      </div>
      {!bestellbar && <p className="muted">Dieser Artikel ist noch nicht bestellbar. Du kannst ihn dir schon ansehen.</p>}

      <div className="shop-sticky" data-show={stickyZeigen}>
        <span className="shop-price-small">{preisText}</span>
        {bestellbar ? <button type="button" className="shop-btn" aria-disabled={gesperrt || undefined} onClick={weiter}>In den Warenkorb</button> : <button type="button" className="shop-btn" aria-disabled="true">Kommt zum Verkauf</button>}
      </div>
    </div>
  );
}
