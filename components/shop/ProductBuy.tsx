"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatPreis } from "@/lib/shop/config";
import { ORIGINALFARBE, ORIGINAL_ABSTAND } from "@/lib/shop/fotos";
import { farbAbstand } from "./fotoFaerben";
import { KOMBI_KEY, einzelpreisCent, istIndividuell, nurEinzelfarben, type Produkt } from "@/lib/shop/produkte";
import { SCHRIFTEN, SCHRIFT_TITEL_KEY, unerlaubteZeichen, fehlendeZeichen, fehlendeZeichenMeldung, umlauteErsetzen } from "@/lib/shop/schriften";
import { GROESSEN, STANDARD_GROESSE, type GroesseId } from "@/lib/shop/umbruch";
import { messeEm } from "@/lib/shop/textmessung";
import {
  NICHT_VERFUEGBAR, PASST_NICHT, formatZuOptionen, echtPasst, groessteDiePasst, pruefePasst, standardFormat, zeilenAnzahl, type TextFormat,
} from "@/lib/shop/textformat";
import ProductImage from "./ProductImage";
import SchriftWahl from "./SchriftWahl";
import { useKaufRegistrieren, useVorschauSetzen } from "./Vorschau";
import type { Farbe } from "@/lib/shop/farben";
import { TEXTE } from "@/lib/shop/config";
import { pruefeWunschtext } from "@/lib/shop/textfilter";
import { LINIENFARBE_HINWEIS, LINIENFARBE_KEY, TEXTFARBE_HINWEIS, TEXTFARBE_KEY, automatischeLinienfarbe, automatischeTextfarbe, textfarbeErlaubt } from "@/lib/shop/textfarbe";
import { standardTeilFarben } from "@/lib/shop/teilfarben";
import { fuegeHinzu, ladeKorb, speichereKorb } from "@/lib/shop/auswahl";

/** Lagerfarbe, die der Fotofarbe am nächsten liegt (Voreinstellung = Foto ohne Umfärbung); null, wenn keine nah genug ist. */
function nahsteFarbe(farben: Farbe[], hex: string): Farbe | undefined {
  let best: Farbe | undefined, bd = ORIGINAL_ABSTAND;
  for (const f of farben) { const d = farbAbstand(f.hex, hex); if (d < bd) { best = f; bd = d; } }
  return best;
}
function hell(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export default function ProductBuy({
  produkt, farben, bestellbar, preisText, wunschPause = false,
}: { produkt: Produkt; farben: Farbe[]; bestellbar: boolean; preisText: string; wunschPause?: boolean }) {
  const kombis = produkt.kombinationen;
  const [farbeId, setFarbeId] = useState<string | null>(kombis || produkt.teile ? null : (produkt.slug in ORIGINALFARBE ? nahsteFarbe(farben, ORIGINALFARBE[produkt.slug]) : produkt.linienfarbe ? farben.find((f) => /^schwarz/i.test(f.name.trim())) : undefined)?.id ?? farben[0]?.id ?? null);
  const [kombiId, setKombiId] = useState<string | null>(kombis?.[0].id ?? null);
  const kombi = kombis?.find((k) => k.id === kombiId);
  // Mehrteilige Artikel (Kürbis): je Teil eine eigene Lagerfarbe, Standard = ähnlichste Farbe zur Referenz (orange / schwarz).
  const teile = produkt.teile;
  const [teilWahl, setTeilWahl] = useState<Record<string, string>>(() => (teile ? standardTeilFarben(teile, farben) : {}));
  const teilFarbe = (id: string) => farben.find((f) => f.id === teilWahl[id]);
  const teileHex = teile ? Object.fromEntries(teile.flatMap((t) => { const f = teilFarbe(t.id); return f ? [[t.id, f.hex]] : []; })) : undefined;
  const [opt, setOpt] = useState<Record<string, string>>(() =>
    Object.fromEntries(produkt.optionen.map((g) => [g.id, g.optionen[0].id])),
  );
  // Einzelartikel mit Tagwahl: Vorschau zeigt den gewählten Wochentag (Mo, Di, ...)
  const tagKurz = kombi ? produkt.optionen.find((g) => g.id === "tag")?.optionen.find((o) => o.id === opt.tag)?.label.slice(0, 2) : undefined;
  const [menge, setMenge] = useState(1);
  const pers = produkt.personalisierung;
  const [zeilen, setZeilen] = useState<string[]>(() => (pers?.zeilen ? pers.zeilen.map((z) => z.standard) : pers ? [pers.standardText ?? ""] : []));
  const [schriftId, setSchriftId] = useState(pers?.festeSchrift ?? pers?.standardSchrift ?? SCHRIFTEN[0].id);
  const [schriftTitelId, setSchriftTitelId] = useState(pers?.standardSchrift ?? SCHRIFTEN[0].id); // nur Namensschild (schriftJeZeile)
  const [fmtRoh, setFmtRoh] = useState<TextFormat>(() => standardFormat(pers ? zeilenAnzahl(pers) : 0));
  // null = Kunde hat keine Stufe gewählt: dann gilt automatisch die größte, die noch passt.
  const [groesseWahl, setGroesseWahl] = useState<GroesseId | null>(null);
  const [hinzu, setHinzu] = useState<{ ok: boolean; menge: number } | null>(null);

  const [bestaetigt, setBestaetigt] = useState(false);
  const bestaetigtTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (bestaetigtTimer.current) clearTimeout(bestaetigtTimer.current); }, []);

  const farbe = farben.find((f) => f.id === farbeId);
  // Schriftfarbe: Kundenwahl gilt, solange sie zur Grundfarbe passt; sonst automatisch die kontrastreichste Lagerfarbe.
  const [textWahl, setTextWahl] = useState<string | null>(null);
  const textGewaehlt = farben.find((f) => f.id === textWahl);
  const textAuto = pers ? automatischeTextfarbe(farbe, farben) : null;
  const textfarbe = textGewaehlt && textfarbeErlaubt(farbe, textGewaehlt) ? textGewaehlt : textAuto;
  // Linienfarbe (Individueller Untersetzer): wie die Schriftfarbe, Voreinstellung Weiß wie auf dem Foto
  const [linienWahl, setLinienWahl] = useState<string | null>(null);
  const linienGewaehlt = farben.find((f) => f.id === linienWahl);
  const linienfarbe = produkt.linienfarbe ? (linienGewaehlt && textfarbeErlaubt(farbe, linienGewaehlt) ? linienGewaehlt : automatischeLinienfarbe(farbe, farben)) : null;
  const schrift = SCHRIFTEN.find((s) => s.id === (pers?.festeSchrift ?? schriftId));
  const schriftTitel = pers?.schriftJeZeile ? SCHRIFTEN.find((s) => s.id === schriftTitelId) : undefined;
  /** Schrift der Zeile i (Namensschild: Zeile 1 = Titel hat eine eigene Schrift) */
  const sz = (i: number) => (i === 1 && schriftTitel ? schriftTitel : schrift);
  const schriftenJeZeile = schrift ? (schriftTitel ? [schrift, schriftTitel] : schrift) : undefined;
  const text = zeilen.map((z) => z.trim()).join("\n");
  // Wirksames Format: Schalter, die die gewählte Schrift nicht kann, zählen nicht (Schriftwechsel setzt sie zurück).
  const fmtOhneGroesse: TextFormat = {
    ...fmtRoh,
    fett: fmtRoh.fett.map((v, i) => v && sz(i)?.hatFett === true),
    kursiv: fmtRoh.kursiv.map((v, i) => v && sz(i)?.hatKursiv === true),
  };
  const textFehler = !pers ? null
    : zeilen.some((z) => z.trim() === "") ? "Bitte fülle alle Textzeilen aus."
    : unerlaubteZeichen(zeilen.join("")).length > 0 ? `Nicht druckbare Zeichen: ${unerlaubteZeichen(zeilen.join("")).join(" ")}`
    : zeilen.findIndex((z, i) => { const s = sz(i); return !!s && fehlendeZeichen(z, s.id).length > 0; }) >= 0 ? (() => { const i = zeilen.findIndex((z, k) => { const s = sz(k); return !!s && fehlendeZeichen(z, s.id).length > 0; }); return fehlendeZeichenMeldung(zeilen[i], sz(i)!.id); })()
    : null;
  const umlauteFehlen = zeilen.some((z, i) => { const s = sz(i); return !!s && fehlendeZeichen(z, s.id).some((c) => c in { "ä": 1, "ö": 1, "ü": 1, "Ä": 1, "Ö": 1, "Ü": 1, "ß": 1 }); });
  const trimmed = zeilen.map((z) => z.trim());
  // Echte Textbreite (im Browser mit der gewählten Schrift gemessen); fontTick misst neu, sobald die Schrift geladen ist.
  const [fontTick, setFontTick] = useState(0);
  const [gemountet, setGemountet] = useState(false); // erst nach dem Mount messen: Server-HTML und erster Client-Render bleiben gleich
  useEffect(() => setGemountet(true), []);
  useEffect(() => {
    const f = typeof document !== "undefined" ? document.fonts : undefined;
    if (!f) return;
    const neu = () => setFontTick((t) => t + 1);
    f.ready.then(neu).catch(() => {});
    f.addEventListener?.("loadingdone", neu);
    return () => f.removeEventListener?.("loadingdone", neu);
  }, []);
  // Echte Breite je Größenstufe nur neu messen, wenn sich Text, Schrift, Format oder die geladene Schrift ändern (nicht bei jedem Neuaufbau).
  const echtErgebnisse = useMemo(() => {
    const m: Partial<Record<GroesseId, ReturnType<typeof echtPasst>>> = {};
    if (!gemountet || !pers || !schrift || textFehler) return m;
    const messer = (t: string, fett: boolean, kursiv: boolean, zeile = 0) => messeEm(t, (sz(zeile) ?? schrift).family, fett, kursiv);
    for (const g of pers.fuellt ? [STANDARD_GROESSE] : GROESSEN.map((x) => x.id)) {
      m[g] = echtPasst(pers, trimmed, schriftenJeZeile ?? schrift, { ...fmtOhneGroesse, groesse: g }, messer);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemountet, pers, schrift?.id, schrift?.family, schriftTitel?.id, schriftTitel?.family, textFehler, trimmed.join("|"), fmtOhneGroesse.fett.join(), fmtOhneGroesse.kursiv.join(), fontTick]);
  const echtFuer = (g: GroesseId) => echtErgebnisse[pers?.fuellt ? STANDARD_GROESSE : g] ?? null;
  const autoGroesse = pers && schrift && !textFehler ? groessteDiePasst(pers, trimmed, schriftenJeZeile ?? schrift, fmtOhneGroesse, (g) => echtFuer(g)?.passt !== false) : fmtOhneGroesse.groesse;
  const fmt: TextFormat = { ...fmtOhneGroesse, groesse: groesseWahl ?? autoGroesse };
  const formatOpt = pers ? formatZuOptionen(fmt) : {};
  const passt = !pers || !schrift || textFehler ? null : pruefePasst(pers, trimmed, schriftenJeZeile ?? schrift, fmt);
  const echt = echtFuer(fmt.groesse);
  const passtNicht = (passt !== null && !passt.passt) || echt?.passt === false;
  const passtMeldung = echt?.passt === false && echt.meldung ? echt.meldung : PASST_NICHT;
  const filter = pers && !textFehler ? pruefeWunschtext(zeilen) : { ok: true as const };
  const [filterZeigen, setFilterZeigen] = useState(false);
  const filterFehler = filterZeigen && !filter.ok ? filter.meldung : null;
  const gesperrt = !filter.ok || passtNicht;
  const beschreibung = [textFehler ? "t-fehler" : null, filterFehler ? "t-filter" : null].filter(Boolean).join(" ") || undefined;
  const individuell = istIndividuell(produkt, text, formatOpt);
  const hatAufpreis = produkt.optionen.some((g) => g.optionen.some((o) => (o.aufpreisCent ?? 0) > 0));
  const livePreis = hatAufpreis ? formatPreis(einzelpreisCent(produkt, opt)) : preisText;
  const setzeVorschau = useVorschauSetzen();
  const beispielText = (zeilen[0] ?? "").trim().slice(0, 9) || pers?.beispiel || "Abc";
  const vorFarbe = (teile ? teilFarbe(teile[0].id)?.hex : farbe?.hex) ?? produkt.grundfarbe;
  const teileKey = JSON.stringify(teileHex ?? {});
  const vorTextfarbe = pers ? textfarbe?.hex : undefined;
  const vorLinienfarbe = linienfarbe?.hex;
  const vorFamily = schrift?.family;
  useEffect(() => {
    setzeVorschau({ preisText: livePreis, farbe: vorFarbe, text: pers ? text : undefined, family: vorFamily, schriftName: pers ? schrift?.name : undefined, farbeName: kombi?.label ?? (teile ? teile.map((t) => `${t.label}: ${teilFarbe(t.id)?.name ?? "?"}`).join(" · ") : farbe?.name), teileFarben: teileHex, farben: kombi?.farben.map((f) => f.hex), tag: tagKurz, format: pers && schrift ? { fmt, breite: schrift.breite, schriftId: schrift.id, ...(schriftTitel ? { titel: { schriftId: schriftTitel.id, breite: schriftTitel.breite, family: schriftTitel.family } } : {}) } : undefined, textfarbe: vorTextfarbe, textfarbeName: pers ? textfarbe?.name : undefined, linienfarbe: vorLinienfarbe, linienfarbeName: linienfarbe?.name, formatKey: pers ? JSON.stringify(formatOpt) + (schrift?.id ?? "") + (schriftTitel?.id ?? "") : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setzeVorschau, vorFarbe, livePreis, text, vorFamily, pers, schrift?.name, schrift?.id, schrift?.breite, schriftTitel?.id, farbe?.name, kombi?.label, teileKey, tagKurz, vorTextfarbe, textfarbe?.name, vorLinienfarbe, linienfarbe?.name, JSON.stringify(formatOpt)]);
  const kaufReg = useKaufRegistrieren();
  const kaufArt = wunschPause ? "pause" : bestellbar ? "ja" : "nein";
  useEffect(() => { kaufReg?.setzeKauf({ art: kaufArt, gesperrt, bestaetigt }); }, [kaufReg?.setzeKauf, kaufArt, gesperrt, bestaetigt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (kaufReg) kaufReg.aktion.current = weiter; });
  function weiter() {
    if (wunschPause) return;
    if (textFehler) { document.getElementById("t-fehler")?.scrollIntoView({ block: "center" }); return; }
    if (passtNicht) { document.getElementById("t-passt")?.scrollIntoView({ block: "center" }); return; }
    if (gesperrt) {
      setFilterZeigen(true);
      requestAnimationFrame(() => document.getElementById("t-filter")?.scrollIntoView({ block: "center" }));
      return;
    }
    const r = fuegeHinzu(ladeKorb(), {
      slug: produkt.slug,
      farbeId,
      ...(teile ? { teilFarben: teilWahl } : {}),
      optionen: { ...opt, ...(kombi ? { [KOMBI_KEY]: kombi.id } : {}), ...formatOpt, ...(pers && textfarbe ? { [TEXTFARBE_KEY]: textfarbe.id } : {}), ...(linienfarbe ? { [LINIENFARBE_KEY]: linienfarbe.id } : {}), ...(pers && schriftTitel ? { [SCHRIFT_TITEL_KEY]: schriftTitel.id } : {}) },
      text: pers ? text : "",
      schriftId: pers ? (pers.festeSchrift ?? schriftId) : null,
      menge,
    });
    if (r.ok) {
      speichereKorb(r.korb);
      setBestaetigt(true);
      if (bestaetigtTimer.current) clearTimeout(bestaetigtTimer.current);
      bestaetigtTimer.current = setTimeout(() => setBestaetigt(false), 2000);
    }
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

  const knopf = wunschPause ? (
    <button type="button" className="shop-btn" aria-disabled="true" aria-describedby="wunsch-pause">Vorübergehend nicht bestellbar</button>
  ) : bestellbar ? (
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
  function schalte(art: "fett" | "kursiv", i: number) {
    if (art === "fett" ? !sz(i)?.hatFett : !sz(i)?.hatKursiv) return;
    const neu = fmtRoh[art].slice(); neu[i] = !neu[i];
    setFmtRoh({ ...fmtRoh, [art]: neu });
  }
  const formatSchalter = (i: number, zeilenLabel: string) => (
    <div className="shop-fmt" role="group" aria-label={`Format: ${zeilenLabel}`}>
      {(["fett", "kursiv"] as const).map((art) => {
        const kann = art === "fett" ? sz(i)?.hatFett === true : sz(i)?.hatKursiv === true;
        const name = art === "fett" ? "Fett" : "Kursiv";
        return (
          <button key={art} type="button" className={`shop-fmt-btn shop-fmt-btn--${art}`} aria-pressed={kann && fmt[art][i] ? true : false}
            aria-disabled={kann ? undefined : true} title={kann ? undefined : NICHT_VERFUEGBAR}
            aria-label={kann ? name : `${name}: ${NICHT_VERFUEGBAR}`} onClick={() => schalte(art, i)}>{name}</button>
        );
      })}
    </div>
  );
  const aendereZeile = (i: number, v: string) => { setZeilen(zeilen.map((x, k) => (k === i ? v : x))); setFilterZeigen(true); };

  return (
    <div className="shop-buy">
      {pers && (
        <fieldset className="shop-step">
          <legend>{pers.label}</legend>
          <div className="shop-textvorschau">
            <ProductImage form={produkt.form} farbe={farbe?.hex ?? produkt.grundfarbe} text={text} family={schrift?.family} format={schrift ? { fmt, breite: schrift.breite, schriftId: schrift.id, ...(schriftTitel ? { titel: { schriftId: schriftTitel.id, breite: schriftTitel.breite, family: schriftTitel.family } } : {}) } : undefined} textfarbe={vorTextfarbe} linienfarbe={vorLinienfarbe} typ="Live-Vorschau" breit />
          </div>
          {pers.zeilen ? (
            pers.zeilen.map((z, i) => (
              <div className="shop-field" key={z.label}>
                <label htmlFor={`t-${i}`}>{z.label}</label>
                <input id={`t-${i}`} className="shop-input" type="text" maxLength={z.max} value={zeilen[i]} autoComplete="off" spellCheck={false}
                  aria-invalid={filterFehler || (passtNicht && (echt?.zeile === undefined || echt.zeile === i)) ? true : undefined} aria-describedby={beschreibung} onBlur={() => setFilterZeigen(true)} onChange={(e) => aendereZeile(i, e.target.value)} />
                {formatSchalter(i, z.label)}
              </div>
            ))
          ) : (
            <div className="shop-field">
              <label htmlFor="t-0">{pers.label}</label>
              <input id="t-0" className="shop-input" type="text" maxLength={pers.maxLaenge} value={zeilen[0]} autoComplete="off" spellCheck={false}
                placeholder={`z. B. ${pers.beispiel}…`} aria-invalid={filterFehler ? true : undefined} aria-describedby={beschreibung} onBlur={() => setFilterZeigen(true)} onChange={(e) => aendereZeile(0, e.target.value)} />
              {formatSchalter(0, pers.label)}
            </div>
          )}
          {pers.fuellt && <p className="muted" style={{ margin: "6px 0 0" }}>Die Schriftgröße passt sich automatisch an: Der Name füllt das Schild, bis zur größten möglichen Höhe.</p>}
          {!pers.fuellt && groesseWahl === null && <p className="muted shop-autogroesse" role="status" style={{ margin: "6px 0 0" }}>Schriftgröße automatisch angepasst: „{GROESSEN.find((g) => g.id === autoGroesse)?.label}“, die größte Stufe, die für deinen Text noch passt. Du kannst die Stufe unten selbst wählen.</p>}
          {!pers.fuellt && <fieldset className="shop-groesse">
            <legend>Schriftgröße{pers.zeilen ? " der großen Zeile" : ""}</legend>
            <div className="shop-options">
              {GROESSEN.map((g) => (
                <label key={g.id} className="shop-option">
                  <input type="radio" name="t-groesse" value={g.id} checked={fmt.groesse === g.id} onChange={() => setGroesseWahl(g.id)} />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
          </fieldset>}
          {passtNicht &&<p id="t-passt" className="shop-err" role="alert"><span>{passtMeldung}</span></p>}
          {textFehler && <p id="t-fehler" className="shop-err" role="alert"><span>{textFehler}</span>
            {umlauteFehlen && <button type="button" className="shop-umlaut-btn" onClick={() => setZeilen((zs) => zs.map((z, i) => umlauteErsetzen(z, sz(i)?.fehlendeZeichen)))}>Umlaute ersetzen (ä→ae, ö→oe, ü→ue, Ä→Ae, Ö→Oe, Ü→Ue, ß→ss)</button>}</p>}
          {filterFehler && (
            <p id="t-filter" className="shop-err" role="alert">
              <span>{filterFehler}<br /><Link className="shop-link" href="/3d-druck/anfrage">Individuell anfragen</Link></span>
            </p>
          )}
          <div className="shop-hinweis">
            <ul>
              <li>Erlaubt: Buchstaben, Zahlen und . , ! ? &amp; - &apos;</li>
              <li><strong>Eigener Text = individuell gefertigt, kein Widerrufsrecht</strong> (§ 312g Abs. 2 Nr. 1 BGB). Das gilt nur, wenn du den Text änderst. Fett, Kursiv oder eine andere Größe allein ändern daran nichts: Widerruf bleibt.</li>
              <li>Der Text wird automatisch geprüft. Die Prüfung und Annahme erfolgt innerhalb von 24 Stunden nach Zahlung; lehne ich ihn ab, erstatte ich den vollen Betrag.</li>
            </ul>
            <details>
              <summary>Mehr dazu</summary>
              <p>Erst nach meiner Prüfung bekommst du die Bestellbestätigung; vorher nur eine Eingangsbestätigung (AGB Ziffer 9 Abs. 3). Der unveränderte Vorschlagstext (auch mit Fett, Kursiv oder anderer Größe) bleibt normale Standardware mit 14 Tagen Widerruf. Im Zweifel hilft eine individuelle Anfrage.</p>
            </details>
          </div>
          <p className="muted">Eigene Schrift (nicht in der Liste), Logo oder Bild? <Link className="shop-link" href="/3d-druck/anfrage">Individuell anfragen</Link></p>
        </fieldset>
      )}

      {pers && !pers.festeSchrift && (
        <>
          <SchriftWahl legend={pers.schriftJeZeile ? "Schrift für den Namen (große Zeile)" : "Schrift wählen"} schriftId={schriftId} onChange={setSchriftId} beispiel={pers.schriftJeZeile ? (zeilen[0] || "Name").trim().slice(0, 20) : beispielText} radioName="t-schrift" hinweis={!pers.schriftJeZeile} />
          {pers.schriftJeZeile && <SchriftWahl legend="Schrift für den Titel (kleine Zeile)" schriftId={schriftTitelId} onChange={setSchriftTitelId} beispiel={(zeilen[1] || "Titel").trim().slice(0, 28)} radioName="t-schrift-titel" />}
        </>
      )}

      {/* Farbwahl */}
      {kombis && kombis.length === 1 ? (
        <p className="shop-step">Diese Untersetzer gibt es nur in dieser Ausführung, siehe Bilder.</p>
      ) : kombis ? (
        <fieldset className="shop-step">
          <legend>{nurEinzelfarben(produkt) ? "Farbe" : "Farbkombination"}</legend>
          <div className="shop-kombis">
            {kombis.map((k) => (
              <label key={k.id} className="shop-kombi">
                <input type="radio" name="farbkombi" value={k.id} checked={kombiId === k.id} onChange={() => setKombiId(k.id)} />
                <span className="shop-kombi-karte">
                  <span className="shop-kombi-punkte" aria-hidden="true">{k.farben.map((f) => <i key={f.name} style={{ background: f.hex }} />)}</span>
                  <span className="shop-kombi-label">{k.label}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="muted">{nurEinzelfarben(produkt) ? "Bildschirmfarben können leicht abweichen." : "Fertige Kombination aus drei Farben. Bildschirmfarben können leicht abweichen."}</p>
        </fieldset>
      ) : teile && farben.length > 0 ? (
        <>
          {teile.map((t) => {
            const gew = teilFarbe(t.id);
            return (
              <fieldset key={t.id} className="shop-step">
                <legend>Farbe {t.label}</legend>
                <div className="shop-swatches">
                  {farben.map((f) => (
                    <label key={f.id} className="shop-swatch">
                      <input type="radio" name={`farbe-${t.id}`} value={f.id} checked={teilWahl[t.id] === f.id} onChange={() => setTeilWahl({ ...teilWahl, [t.id]: f.id })} aria-label={`${f.name} (${t.label})`} />
                      <span className="dot" style={{ background: f.hex }}>
                        <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" fill="none" stroke={hell(f.hex) ? "#2e1c0f" : "#fff"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    </label>
                  ))}
                </div>
                <p aria-live="polite" style={{ marginTop: 6 }}><strong>{t.label}: {gew?.name}</strong> · auf Lager</p>
              </fieldset>
            );
          })}
          <p className="muted">Nur Farben, die gerade im Regal liegen. Bildschirmfarben können leicht abweichen.</p>
        </>
      ) : farben.length > 0 ? (
        <fieldset className="shop-step">
          <legend>{produkt.linienfarbe ? "Untersetzerfarbe" : "Farbe"}</legend>
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
            <strong>{produkt.linienfarbe ? "Untersetzerfarbe" : "Farbe"}: {farbe?.name}</strong> · auf Lager
          </p>
          <p className="muted">Nur Farben, die gerade im Regal liegen. Bildschirmfarben können leicht abweichen.</p>
        </fieldset>
      ) : (
        <div className="shop-note">
          <strong>Gerade keine Farbe auf Lager.</strong>
          <p><Link className="shop-link" href="/3d-druck/anfrage">Individuell anfragen</Link></p>
        </div>
      )}

      {/* Linienfarbe (nur Individueller Untersetzer): Lagerfarben, nie gleich/zu ähnlich wie die Untersetzerfarbe */}
      {produkt.linienfarbe && farben.length > 0 && (
        <fieldset className="shop-step shop-textfarbe">
          <legend>Linienfarbe</legend>
          <div className="shop-swatches">
            {farben.map((f) => {
              const erlaubt = textfarbeErlaubt(farbe, f);
              return (
                <label key={f.id} className="shop-swatch" data-gesperrt={erlaubt ? undefined : true}>
                  <input type="radio" name="linienfarbe" value={f.id} checked={linienfarbe?.id === f.id} disabled={!erlaubt}
                    onChange={() => setLinienWahl(f.id)} aria-label={erlaubt ? f.name : `${f.name} (nicht wählbar: ${LINIENFARBE_HINWEIS})`} />
                  <span className="dot" style={{ background: f.hex }}>
                    <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" fill="none" stroke={hell(f.hex) ? "#2e1c0f" : "#fff"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </label>
              );
            })}
          </div>
          <p aria-live="polite" style={{ marginTop: 6 }}>
            <strong>Linienfarbe: {linienfarbe?.name ?? "keine passende Farbe"}</strong>{linienfarbe ? " · auf Lager" : ""}
          </p>
          <p className="muted">Die dünnen Zierlinien am Rand. {LINIENFARBE_HINWEIS}: ausgegraute Farben passen nicht zur gewählten Untersetzerfarbe. Die Linienfarbe ändert weder Preis noch Widerrufsrecht.</p>
        </fieldset>
      )}

      {/* Schriftfarbe (nur Wunschtext-Artikel): Lagerfarben, nie gleich/zu ähnlich wie die Grundfarbe */}
      {pers && farben.length > 0 && (
        <fieldset className="shop-step shop-textfarbe">
          <legend>Schriftfarbe</legend>
          <div className="shop-swatches">
            {farben.map((f) => {
              const erlaubt = textfarbeErlaubt(farbe, f);
              return (
                <label key={f.id} className="shop-swatch" data-gesperrt={erlaubt ? undefined : true}>
                  <input type="radio" name="textfarbe" value={f.id} checked={textfarbe?.id === f.id} disabled={!erlaubt}
                    onChange={() => setTextWahl(f.id)} aria-label={erlaubt ? f.name : `${f.name} (nicht wählbar: ${TEXTFARBE_HINWEIS})`} />
                  <span className="dot" style={{ background: f.hex }}>
                    <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" fill="none" stroke={hell(f.hex) ? "#2e1c0f" : "#fff"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </label>
              );
            })}
          </div>
          <p aria-live="polite" style={{ marginTop: 6 }}>
            <strong>Schriftfarbe: {textfarbe?.name ?? "keine passende Farbe"}</strong>{textfarbe ? " · auf Lager" : ""}
          </p>
          <p className="muted">{TEXTFARBE_HINWEIS}: ausgegraute Farben passen nicht zur gewählten Grundfarbe. Die Schriftfarbe ändert weder Preis noch Widerrufsrecht.</p>
        </fieldset>
      )}

      {produkt.optionen.map((g, gi) => (
        <fieldset key={g.id} className="shop-step">
          <legend>{g.label}</legend>
          <div className="shop-options">
            {g.optionen.map((o) => (
              <label key={o.id} className="shop-option">
                <input type="radio" name={`opt-${g.id}`} value={o.id} checked={opt[g.id] === o.id} onChange={() => setOpt({ ...opt, [g.id]: o.id })} />
                <span>{o.label}{(o.aufpreisCent ?? 0) > 0 ? ` (+ ${formatPreis(o.aufpreisCent!)})` : ""}</span>
              </label>
            ))}
          </div>
          {hatAufpreis && gi === produkt.optionen.length - 1 && <p aria-live="polite" style={{ marginTop: 6 }}><strong>Dein Preis: {livePreis}</strong> {produkt.form === "set" || /set/i.test(produkt.name) ? "pro Set" : "pro Stück"}</p>}
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
        <div className="shop-kaufknopf">{knopf}</div>
        {wunschPause ? <p id="wunsch-pause" className="shop-pause-hinweis" role="note">Artikel mit Wunschtext sind aktuell pausiert und lassen sich nicht in den Warenkorb legen. Alle anderen Artikel bleiben bestellbar.</p> : widerruf}
      </div>
      <div id="hinzu" role="status" aria-live="polite">
        {hinzu && (
          <div className={hinzu.ok ? "shop-note" : "shop-note shop-note--warn"} style={{ display: "grid", gap: 10 }}>
            {hinzu.ok ? (
              <strong>Hinzugefügt: {hinzu.menge} × {produkt.name}</strong>
            ) : (
              <strong>Der Warenkorb ist voll (höchstens 10 verschiedene Positionen). Bitte schließe zuerst die Bestellung ab oder entferne eine Position.</strong>
            )}
            <div className="shop-actions" style={{ marginTop: 0 }}>
              <Link className="shop-btn" href="/3d-druck/warenkorb">Zum Warenkorb</Link>
              <Link className="shop-btn shop-btn--ghost" href="/3d-druck#stuecke">Weiter einkaufen</Link>
            </div>
          </div>
        )}
      </div>
      {!bestellbar && <p className="muted">Dieser Artikel ist noch nicht bestellbar. Du kannst ihn dir schon ansehen.</p>}
    </div>
  );
}
