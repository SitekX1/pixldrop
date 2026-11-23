"use client";
// Konfigurator für Wandbuchstaben in Schrift (Design-Buchstaben): Wort eintippen, Schrift, Farbe und Höhe wählen,
// Vorschau am Foto einer weißen Wand mit Schreibtisch, maßstäblich (Höhe der Großbuchstaben in cm, die Schrift wird real gemessen).
// Bestellbar (bestellbar=true): Preis je Zeichen aus lib/shop/wand.ts, "In den Warenkorb"; sonst und für Sonderfälle: Anfrage.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatPreis } from "@/lib/shop/config";
import { fuegeHinzu, ladeKorb, speichereKorb } from "@/lib/shop/auswahl";
import { WAND_SCHRIFTEN } from "@/lib/shop/schriften-wand";
import {
  WAND_DICKEN, WAND_DICKE_STANDARD, WAND_FARBEN, WAND_HOEHEN, WAND_NUR_REGULAR, WAND_OBERFLAECHEN, WAND_SCHREIBSCHRIFTEN, ersterGross, maxWandHoehe, nichtDruckbar, pruefeWandKonfiguration, schriftHatZeichen, wandFarbSperrId, WAND_SLUG,
} from "@/lib/shop/wand";

const WAND_ZEICHEN_ENTFERNEN = /[^\p{L}\p{N} .,!&'-]/gu;
const WAND_ZEICHEN_FILTER = /^[\p{L}\p{N} .,!&'-]$/u; // ein erlaubtes Zeichen
const FARBEN = WAND_FARBEN;
const HOEHEN = WAND_HOEHEN; // cm, Höhe der Großbuchstaben (30 cm gibt es nicht: Druckbett 256 mm)
const FOTO_CM = 150; // Annahme: der Schreibtisch im Foto ist ca. 150 cm breit
const FADE = "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent), linear-gradient(to bottom, transparent, #000 14%)";
const OBERFLAECHEN = WAND_OBERFLAECHEN;
const SCHREIBSCHRIFTEN = WAND_SCHREIBSCHRIFTEN; // nur hier wählbar: Schreibweise
const EINSTELLBAR_400 = WAND_NUR_REGULAR; // Schriften nur in Regular (kein Fett)

function abdunkeln(hex: string, f = 0.62) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * f).toString(16).padStart(2, "0");
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

export default function WandKonfigurator({ bestellbar = false, farbenAus = [] }: { bestellbar?: boolean; farbenAus?: string[] }) {
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [schriftId, setSchriftId] = useState(WAND_SCHRIFTEN[0].id);
  const [schriftOv, setSchriftOv] = useState<(string | null)[]>([null, null, null]); // null = wie Zeile 1
  const [farbeId, setFarbeId] = useState("schwarz");
  const [cm, setCm] = useState(15);
  const [cmOv, setCmOv] = useState<(number | null)[]>([null, null, null]); // null = wie Zeile 1
  const [aktiv, setAktiv] = useState(0);
  const [oberflaecheId, setOberflaecheId] = useState("glatt");
  const [dicke, setDicke] = useState<number>(WAND_DICKE_STANDARD);
  const [schreibweise, setSchreibweise] = useState<"eingabe" | "erster-gross">("eingabe");
  const oberflaeche = OBERFLAECHEN.find((o) => o.id === oberflaecheId)!;
  const [farbeOv, setFarbeOv] = useState<(string | null)[]>([null, null, null]); // null = wie Zeile 1

  const [texte, setTexte] = useState(["Willkommen", "", ""]);
  const [anzahl, setAnzahl] = useState(1); // sichtbare Textfelder (1 bis 3)
  const zeilen = useMemo(() => texte.slice(0, anzahl).map((z) => z.replace(WAND_ZEICHEN_ENTFERNEN, "").slice(0, 20)), [texte, anzahl]);
  const leer = zeilen.every((z) => !z.trim());
  const eintraege = zeilen.map((z, i) => ({ z, i })).filter((e) => e.z.trim()); // Zeilen mit Text (Feld-Index bleibt erhalten)
  const zwei = eintraege.length > 1; // mehr als eine Zeile mit Text
  const akt = zwei ? (eintraege.some((e) => e.i === aktiv) ? aktiv : eintraege[0].i) : (eintraege[0]?.i ?? 0);
  const ids = [0, 1, 2].map((i) => (i === 0 ? schriftId : schriftOv[i] ?? schriftId));
  const cmWahl = [0, 1, 2].map((i) => (i === 0 ? cm : cmOv[i] ?? cm));
  const farbIds = [0, 1, 2].map((i) => (i === 0 ? farbeId : farbeOv[i] ?? farbeId));
  const farbeVon = (i: number) => FARBEN.find((f) => f.id === farbIds[i])!;
  const [entfernt, setEntfernt] = useState<string[]>([]); // zuletzt entfernte, nicht druckbare Zeichen
  const gesetzt = (i: number, v: string) => {
    const weg: string[] = [];
    const sauber = [...v].filter((ch) => (WAND_ZEICHEN_FILTER.test(ch) ? true : (weg.push(ch), false))).join("");
    if (weg.length) setEntfernt((alt) => [...new Set([...alt, ...weg])]);
    setTexte((t) => t.map((x, k) => (k === i ? sauber.slice(0, 20) : x)));
  };
  const mitSchreibweise = eintraege.some((e) => SCHREIBSCHRIFTEN.has(ids[e.i]));
  const zeilenF = zeilen.map((z, i) => (schreibweise === "erster-gross" && SCHREIBSCHRIFTEN.has(ids[i]) ? ersterGross(z) : z));
  // Größte druckbare Höhe je Zeile: jeder Buchstabe wird einzeln gedruckt und muss aufs Druckbett (256 mm) passen. 0 = Zeichen fehlt in der Schrift.
  const grenzen = [0, 1, 2].map((i) => (zeilenF[i]?.trim() ? maxWandHoehe(ids[i], zeilenF[i]) : WAND_HOEHEN[WAND_HOEHEN.length - 1]));
  const cms = [0, 1, 2].map((i) => (grenzen[i] > 0 ? Math.min(cmWahl[i], grenzen[i]) : cmWahl[i]));
  const fehltInSchrift = (i: number) => [...new Set([...zeilenF[i]].filter((ch) => ch !== " " && !schriftHatZeichen(ids[i], ch)))];
  const schriftVon = (i: number) => WAND_SCHRIFTEN.find((s) => s.id === ids[i])!;
  const gewichtVon = (id: string) => (EINSTELLBAR_400.has(id) ? 400 : 700);
  const schrift = schriftVon(0);
  const farbe = farbeVon(akt);
  const aktId = ids[akt], aktCm = cms[akt];
  const setzeSchrift = (id: string) => (akt === 0 ? setSchriftId(id) : setSchriftOv((o) => o.map((x, k) => (k === akt ? id : x))));
  const setzeCm = (h: number) => (akt === 0 ? setCm(h) : setCmOv((o) => o.map((x, k) => (k === akt ? h : x))));
  const anzeige = leer ? [{ z: "Dein Wort", i: 0 }] : eintraege.map((e) => ({ z: zeilenF[e.i], i: e.i }));
  const setzeFarbe = (id: string) => (akt === 0 ? setFarbeId(id) : setFarbeOv((o) => o.map((x, k) => (k === akt ? id : x))));
  const ueberschrieben = schriftOv.some((x) => x !== null) || cmOv.some((x) => x !== null) || farbeOv.some((x) => x !== null);

  // Echte Höhe der Großbuchstaben (Anteil der Schriftgröße) je Schrift per Messung, damit "15 cm" auch bei Schreibschriften stimmt
  const textRef = useRef<HTMLDivElement>(null);
  const bildRef = useRef<HTMLDivElement>(null);
  const zeilenRef = useRef<(HTMLDivElement | null)[]>([]);
  const [caps, setCaps] = useState<Record<string, number>>({});
  const capVon = (id: string) => caps[id] ?? 0.7;
  const idsKey = ids.join("|");
  useEffect(() => {
    let weg = false;
    (async () => {
      for (let i = 0; i < 3; i++) {
        const el = zeilenRef.current[i];
        const id = idsKey.split("|")[i];
        if (!el || !id) continue;
        const g = gewichtVon(id);
        const ff = getComputedStyle(el).fontFamily;
        try { await document.fonts.load(`${g} 100px ${ff}`, "H"); } catch { /* egal, Messung mit Ersatzschrift */ }
        const c = document.createElement("canvas").getContext("2d");
        if (!c) return;
        c.font = `${g} 100px ${ff}`;
        const r = c.measureText("H").actualBoundingBoxAscent / 100;
        if (!weg && r > 0.2 && r < 1.2) setCaps((alt) => (alt[id] === r ? alt : { ...alt, [id]: r }));
      }
    })();
    return () => { weg = true; };
  }, [idsKey, eintraege.map((e) => e.i).join(",")]);

  // Das Foto bleibt immer vollflächig (Wand = FOTO_CM breit). Ist das Wort zu groß für die Wand, wird es in der Vorschau verkleinert.
  const wandCm = FOTO_CM;
  const [faktor, setFaktor] = useState(1);
  const [breiteCm, setBreiteCm] = useState(0); // echte Breite des Wortes in cm (ohne Verkleinerung)
  useLayoutEffect(() => {
    const t = textRef.current, b = bildRef.current;
    if (!t || !b) return;
    const messen = () => {
      const br = b.getBoundingClientRect().width;
      const tr = t.getBoundingClientRect();
      const tcm = ((tr.width / br) * wandCm) / faktor;
      const hcm = ((tr.height / br) * wandCm) / faktor;
      setBreiteCm(tcm);
      const ziel = Math.min(1, (0.9 * wandCm) / Math.max(tcm, 1), (0.31 * wandCm) / Math.max(hcm, 1));
      if (Math.abs(ziel - faktor) > 0.003) setFaktor(ziel);
    };
    messen();
    const ro = new ResizeObserver(messen);
    ro.observe(t); ro.observe(b);
    return () => ro.disconnect();
  }, [zeilen, idsKey, cm, cmOv, caps, faktor]);

  const sk = 1;
  const cqw = (v: number) => `${(v / wandCm) * 100}cqw`;
  // Dicke ca. 10 mm: gestapelte Schatten nach rechts unten + weicher Wurf auf die Wand
  const tiefe = (k: number) => `${(k * 0.1) / wandCm * 100}cqw`;
  const schattenVon = (i: number) => {
    const dunkel = abdunkeln(farbeVon(i).hex);
    return [1, 2, 3, 4, 5, 6].map((k) => `${tiefe(k)} ${tiefe(k)} 0 ${dunkel}`).join(", ")
      + `, ${cqw(1.4)} ${cqw(2.2)} ${cqw(2.4)} rgba(40, 30, 20, .28)`;
  };

  const beschr = (i: number) => `Zeile ${eintraege.findIndex((e) => e.i === i) + 1} „${zeilenF[i].trim()}“ in ${schriftVon(i).name}, Höhe der Großbuchstaben ${cms[i]} cm, Farbe ${farbeVon(i).name}`;
  const entwurf = `Wandbuchstaben-Entwurf aus dem Konfigurator: ${zwei ? eintraege.map((e) => beschr(e.i)).join("; ") : `„${(zeilenF[akt] ?? "").trim()}“ in ${schriftVon(akt).name}, Höhe der Großbuchstaben ${cms[akt]} cm, Farbe ${farbeVon(akt).name}`}, Oberfläche ${oberflaeche.name}, Dicke ${dicke} mm${mitSchreibweise ? `, Schreibweise ${schreibweise === "erster-gross" ? "erster Buchstabe groß, Rest klein" : "genau wie eingegeben"}` : ""}, Breite ca. ${Math.round(breiteCm)} cm. Bitte um ein Angebot.`;
  const href = `/3d-druck/anfrage?entwurf=${encodeURIComponent(entwurf)}`;
  // Verbindliche Prüfung wie auf dem Server: Preis, Rabatt, Druckbett, Farben, Wortfilter
  const eingabe = { zeilen: eintraege.map((e) => ({ text: zeilen[e.i], schrift: ids[e.i], hoeheCm: cms[e.i], farbe: farbIds[e.i] })), oberflaeche: oberflaecheId, dickeMm: dicke, schreibweise };
  const pruef = leer ? null : pruefeWandKonfiguration(eingabe);
  const gesperrteFarbe = pruef?.ok ? pruef.wert.zeilen.find((z) => farbenAus.includes(wandFarbSperrId(z.farbe))) : undefined;
  const inKorb = () => {
    if (!pruef?.ok || !bestellbar || gesperrteFarbe) return;
    const r = fuegeHinzu(ladeKorb(), { slug: WAND_SLUG, farbeId: null, optionen: { wand: JSON.stringify(eingabe) }, text: "", schriftId: null, menge: 1 });
    if (!r.ok) { setMeldung({ ok: false, text: "Der Warenkorb ist voll (höchstens 50 Positionen). Bitte bestelle in zwei Runden." }); return; }
    speichereKorb(r.korb);
    setMeldung({ ok: true, text: "Deine Wandbuchstaben liegen im Warenkorb." });
  };
  const markierung = (s: string) => ({ ["--wk-font" as string]: s });

  return (
    <section className="shop-bk shop-wk" aria-labelledby="wk-titel">
      <div className="shop-bk-kopf">
        <p className="shop-overline">Konfigurator · Wandbuchstaben</p>
        <h1 id="wk-titel">Dein Wort an der Wand</h1>
        <p className="shop-bk-sub">Tipp dein Wort ein, wähle Schrift, Farbe und Höhe. Die Vorschau zeigt die Buchstaben maßstäblich an einer Wand. {bestellbar ? "Den Preis siehst du sofort, jeder Buchstabe wird einzeln für dich gedruckt." : "Bestellen geht noch nicht: Du kannst deinen Entwurf als Anfrage an mich schicken und bekommst ein Angebot per E-Mail."}</p>
      </div>

      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <filter id="wk-fuzzy" x="-2%" y="-5%" width="104%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="shop-bk-raster">
        <div className="shop-bk-wand" role="img" aria-label={`Vorschau: ${anzeige.map((a) => a.z).join(" ")} in ${[...new Set(anzeige.map((a) => WAND_SCHRIFTEN.find((s) => s.id === ids[a.i])!.name))].join(" und ")}`}>
          <div ref={bildRef} className="shop-bk-bild shop-wk-bild">
            <div className="shop-wk-text-feld">
              <div
                ref={textRef} className="shop-wk-text"
                style={{ ...(oberflaecheId === "strukturiert" ? { filter: "url(#wk-fuzzy)" } : {}), ...markierung(schrift.family) }}
              >
                {anzeige.map(({ z, i }) => (
                  <div
                    key={i} ref={(el) => { zeilenRef.current[i] = el; }}
                    style={{ fontFamily: schriftVon(i).family, fontWeight: gewichtVon(ids[i]), fontSize: cqw((cms[i] / capVon(ids[i])) * faktor), color: farbeVon(i).hex, textShadow: schattenVon(i), ...(SCHREIBSCHRIFTEN.has(ids[i]) ? { letterSpacing: "0.14em", fontKerning: "none", fontVariantLigatures: "none" } : {}), ...(leer ? { opacity: .35 } : {}) }}
                  >{z || " "}</div>
                ))}
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="shop-wk-foto" src="/shop/inspiration/wand-leer.webp" alt="" aria-hidden="true" width={1400} height={933}
              style={{ width: `${sk * 100}cqw`, left: `${(100 - sk * 100) / 2}cqw`, ...(sk < 0.98 ? { WebkitMaskImage: FADE, maskImage: FADE } : {}) }}
            />
            <div className="shop-bk-hoehe">{zwei && new Set(eintraege.map((e) => cms[e.i])).size > 1 ? eintraege.map((e, k) => `Zeile ${k + 1}: ${cms[e.i]} cm`).join(" · ") : `Buchstaben ${cms[akt]} cm hoch`}{faktor < 0.995 ? " · Vorschau verkleinert" : ""}</div>
          </div>
        </div>

        <div className="shop-bk-steuer">
          <div className="shop-bk-feld">
            <span>Dein Wort <em>(bis zu 3 Zeilen, je 20 Zeichen)</em></span>
            {Array.from({ length: anzahl }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: i ? 8 : 0 }}>
                <input
                  className="shop-input" type="text" value={texte[i]} maxLength={20} spellCheck={false} aria-label={`Zeile ${i + 1}`} placeholder={i ? `Zeile ${i + 1} (optional)` : "Dein Wort"}
                  onChange={(e) => gesetzt(i, e.target.value)} onBlur={() => setEntfernt([])} style={{ textTransform: "none", letterSpacing: "normal", flex: 1 }}
                />
                {i > 0 && i === anzahl - 1 && (
                  <button type="button" className="shop-bk-link" aria-label={`Zeile ${i + 1} entfernen`} onClick={() => { gesetzt(i, ""); setAnzahl(i); setAktiv(0); }}>Entfernen</button>
                )}
              </div>
            ))}
            <p className="shop-bk-klein shop-bk-zeichenhinweis" role="status" aria-live="polite">
              {entfernt.length > 0 && <>Diese Zeichen kann ich nicht drucken und habe sie entfernt: {entfernt.map((c) => (c === " " ? "Leerzeichen" : c)).join(" ")}. Bitte prüfe dein Wort.</>}
            </p>
            {anzahl < 3 && (
              <button type="button" className="shop-bk-link" style={{ marginTop: 8, alignSelf: "flex-start" }} onClick={() => setAnzahl(anzahl + 1)}>+ Weitere Zeile hinzufügen</button>
            )}
          </div>

          {zwei && (
            <fieldset className="shop-bk-feld">
              <legend>Einstellen für</legend>
              <div className="shop-options">
                {eintraege.map((e, k) => (
                  <label key={e.i} className="shop-option"><input type="radio" name="wk-zeile" checked={akt === e.i} onChange={() => setAktiv(e.i)} /><span>Zeile {k + 1}: {e.z.trim().slice(0, 10)}</span></label>
                ))}
              </div>
              <span className="shop-bk-klein">Jede Zeile kann eine eigene Schrift, Farbe und Höhe haben. Weitere Zeilen folgen Zeile 1, bis du sie änderst.{ueberschrieben && <> <button type="button" className="shop-bk-link" onClick={() => { setSchriftOv([null, null, null]); setCmOv([null, null, null]); setFarbeOv([null, null, null]); }}>Alle Zeilen wie Zeile 1</button></>}</span>
            </fieldset>
          )}

          <fieldset className="shop-bk-feld">
            <legend>Schrift{zwei ? ` (Zeile ${eintraege.findIndex((e) => e.i === akt) + 1})` : ""}</legend>
            <div className="shop-wk-schriften">
              {WAND_SCHRIFTEN.map((s) => (
                <label key={s.id} className="shop-wk-schrift">
                  <input type="radio" name="wk-schrift" checked={aktId === s.id} onChange={() => setzeSchrift(s.id)} />
                  <span style={{ fontFamily: s.family, fontWeight: EINSTELLBAR_400.has(s.id) ? 400 : 700 }}>
                    <b>{(zeilen[akt] || "Aa").trim().slice(0, 6) || "Aa"}</b>
                    <small>{s.name}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {mitSchreibweise && (
            <fieldset className="shop-bk-feld">
              <legend>Schreibweise</legend>
              <div className="shop-options">
                <label className="shop-option"><input type="radio" name="wk-schreibweise" checked={schreibweise === "eingabe"} onChange={() => setSchreibweise("eingabe")} /><span>Genau wie eingegeben</span></label>
                <label className="shop-option"><input type="radio" name="wk-schreibweise" checked={schreibweise === "erster-gross"} onChange={() => setSchreibweise("erster-gross")} /><span>Erster Buchstabe groß, Rest klein</span></label>
              </div>
              <span className="shop-bk-klein">Bei Schreibschriften sind Großbuchstaben Zierformen für den Wortanfang.</span>
            </fieldset>
          )}

          <fieldset className="shop-bk-feld">
            <legend>Höhe der Großbuchstaben{zwei ? ` (Zeile ${eintraege.findIndex((e) => e.i === akt) + 1})` : ""}</legend>
            <div className="shop-options">
              {HOEHEN.map((h) => {
                const frei = grenzen[akt] === 0 || h <= grenzen[akt];
                return (
                  <label key={h} className="shop-option" style={frei ? undefined : { opacity: .4 }}>
                    <input type="radio" name="wk-hoehe" checked={aktCm === h} disabled={!frei} onChange={() => setzeCm(h)} /><span>{h} cm</span>
                  </label>
                );
              })}
            </div>
            {(() => {
              const fehlt = fehltInSchrift(akt);
              if (fehlt.length) return <span className="shop-bk-klein">Diese Schrift hat kein „{fehlt.join("“, „")}“. Bitte ändere das Wort oder wähle eine andere Schrift.</span>;
              const g = grenzen[akt];
              const naechste = HOEHEN.find((h) => h > g);
              if (!naechste || !(zeilenF[akt] ?? "").trim()) return null;
              return <span className="shop-bk-klein">Bis {g} cm möglich. Bei {naechste} cm passt „{nichtDruckbar(aktId, zeilenF[akt], naechste).join("“, „")}“ nicht mehr aufs Druckbett (256 mm), denn jeder Buchstabe wird in einem Stück gedruckt. Mit einer anderen Schrift oder einem anderen Wort geht oft mehr, oder du schickst mir unten eine Anfrage, dann finden wir eine Lösung.</span>;
            })()}
          </fieldset>

          <fieldset className="shop-bk-feld">
            <legend>Farbe{zwei ? ` (Zeile ${eintraege.findIndex((e) => e.i === akt) + 1})` : ""}</legend>
            <div className="shop-swatches">
              {FARBEN.map((f) => (
                <label key={f.id} className="shop-swatch" title={farbenAus.includes(wandFarbSperrId(f.id)) ? `${f.name} (gerade nicht lieferbar)` : f.name} style={farbenAus.includes(wandFarbSperrId(f.id)) ? { opacity: .35 } : undefined}>
                  <input type="radio" name="wk-farbe" aria-label={f.name} checked={farbIds[akt] === f.id} disabled={farbenAus.includes(wandFarbSperrId(f.id))} onChange={() => setzeFarbe(f.id)} />
                  <span className="dot" style={{ background: f.hex }} />
                </label>
              ))}
            </div>
            <span className="shop-bk-klein">{farbe.name} · matt, PLA</span>
          </fieldset>

          <fieldset className="shop-bk-feld">
            <legend>Oberfläche</legend>
            <div className="shop-options">
              {OBERFLAECHEN.map((o) => (
                <label key={o.id} className="shop-option"><input type="radio" name="wk-oberflaeche" checked={oberflaecheId === o.id} onChange={() => setOberflaecheId(o.id)} /><span>{o.name}</span></label>
              ))}
            </div>
            <span className="shop-bk-klein">{oberflaeche.info}</span>
          </fieldset>

          <fieldset className="shop-bk-feld">
            <legend>Dicke</legend>
            <div className="shop-options">
              {WAND_DICKEN.map((d) => (
                <label key={d} className="shop-option"><input type="radio" name="wk-dicke" checked={dicke === d} onChange={() => setDicke(d)} /><span>{d} mm{d === WAND_DICKE_STANDARD ? " (Standard)" : ""}</span></label>
              ))}
            </div>
            <span className="shop-bk-klein">{dicke === 10 ? "10 mm: besonders stabil und kräftig an der Wand." : "5 mm: dünner und günstiger, etwas weniger stabil."}</span>
          </fieldset>

          {bestellbar && (
            <div className="shop-bk-preis" aria-live="polite">
              {pruef?.ok ? (
                <>
                  <ul className="shop-bk-posten">
                    {pruef.wert.zeilen.map((z, zi) => (
                      <li key={zi}><span>„{z.text}“ · {z.zeichen} Zeichen × {formatPreis(z.cent / z.zeichen)}</span><strong>{formatPreis(z.cent)}</strong></li>
                    ))}
                    {pruef.wert.rabattCent > 0 && <li><span>10 % Mengenrabatt ab 10 Zeichen</span><strong>−{formatPreis(pruef.wert.rabattCent)}</strong></li>}
                  </ul>
                  <p className="shop-bk-gesamt"><span>Gesamt</span><strong>{formatPreis(pruef.wert.gesamtCent)}</strong></p>
                  <span className="shop-bk-klein">Preis je Zeichen, Leerzeichen kosten nichts. Dazu kommt der Versand. Ca. {Math.round(breiteCm)} cm breit. Jedes Stück wird frisch für dich gedruckt, die Lieferzeit hängt von Wortlänge und Höhe ab.</span>
                </>
              ) : (
                <span className="shop-bk-klein">{leer ? "Tipp ein Wort ein, dann siehst du den Preis." : pruef && !pruef.ok ? pruef.meldung : ""}</span>
              )}
              {gesperrteFarbe && <span className="shop-bk-klein">Die Farbe in Zeile {pruef?.ok ? pruef.wert.zeilen.indexOf(gesperrteFarbe) + 1 : 1} ist gerade nicht lieferbar. Bitte wähle eine andere.</span>}
            </div>
          )}
          {bestellbar && (
            <p className="shop-note shop-wk-recht">
              <strong>Wichtig vor dem Kauf:</strong> Jedes Stück wird erst nach deiner Bestellung nach deinen Vorgaben für dich gedruckt. Deshalb besteht <strong>kein Widerrufsrecht</strong> (§ 312g Abs. 2 Nr. 1 BGB); gesetzliche Mängelrechte bleiben. Die Vorschau ist eine Annäherung: Farbton, Glanz, Schriftdetails und Maßstab können leicht abweichen. Breite und Höhe stehen oben, die Höhe gilt für Großbuchstaben. Prüfe Schreibweise, Schrift und Farbe genau, ein so bestellter Tippfehler ist kein Mangel.
            </p>
          )}
          <div className="shop-bk-summe">
            <div>
              <strong>ca. {Math.round(breiteCm)} cm breit</strong>
              <span>{bestellbar ? "Passt etwas nicht? Schick mir eine Anfrage." : "Preis nach Angebot, unverbindlich"}</span>
            </div>
            {bestellbar && <button type="button" className="shop-btn" disabled={!pruef?.ok || !!gesperrteFarbe} onClick={inKorb}>In den Warenkorb</button>}
            <Link className={bestellbar ? "shop-btn shop-btn--ghost" : "shop-btn"} href={href} aria-disabled={leer || undefined}>Anfrage senden</Link>
          </div>
          {meldung && (
            <p className={meldung.ok ? "shop-note" : "shop-note shop-note--warn"} role="status" aria-live="polite">
              {meldung.text} {meldung.ok && <Link className="shop-link" href="/3d-druck/warenkorb">Zum Warenkorb</Link>}
            </p>
          )}
          <p className="shop-bk-klein">Die Vorschau ist eine Annäherung an Farbe, Maßstab und Schriftbild. Dünne Linien (Schreibschriften, Serifen) brauchen eine Mindesthöhe, ich sage dir im Angebot, was bei deinem Wunsch geht.</p>
        </div>
      </div>
    </section>
  );
}
