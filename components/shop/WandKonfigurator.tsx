"use client";
// Konfigurator für Wandbuchstaben in Schrift (Design-Buchstaben): Wort eintippen, Schrift, Farbe und Höhe wählen,
// Vorschau am Foto einer weißen Wand mit Schreibtisch, maßstäblich (Höhe der Großbuchstaben in cm, die Schrift wird real gemessen).
// Bestellbar ist das noch nicht: Der Entwurf geht als Anfrage an mich (Preis nach Angebot).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { WAND_SCHRIFTEN } from "@/lib/shop/schriften-wand";

const FARBEN = [
  { id: "schwarz", name: "Schwarz", hex: "#1a1a1a" },
  { id: "weiss", name: "Weiß", hex: "#fbfaf6" },
  { id: "beige", name: "Beige", hex: "#e4d8bc" },
  { id: "grau", name: "Grau", hex: "#8e9089" },
  { id: "braun", name: "Braun", hex: "#a8785a" },
  { id: "olivgruen", name: "Olivgrün", hex: "#5a6d3d" },
];
const HOEHEN = [8, 10, 12, 15, 20, 25, 30]; // cm, Höhe der Großbuchstaben
const FOTO_CM = 150; // Annahme: der Schreibtisch im Foto ist ca. 150 cm breit
const FADE = "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent), linear-gradient(to bottom, transparent, #000 14%)";
const OBERFLAECHEN = [
  { id: "glatt", name: "Glatt", info: "Klassisch glatt, feine Schichtlinien sind je nach Licht sichtbar." },
  { id: "strukturiert", name: "Strukturiert", info: "Fuzzy Skin: fein raue, matte Oberfläche, die Schichtlinien und Fingerabdrücke kaschiert." },
];
const SCHREIBSCHRIFTEN = new Set(["great-vibes", "parisienne", "dancing-script", "marck-script"]); // nur hier wählbar: Schreibweise
const ersterGross = (z: string) => { const t = z.toLowerCase(); const i = t.search(/\p{L}/u); return i < 0 ? t : t.slice(0, i) + t[i].toUpperCase() + t.slice(i + 1); };
const EINSTELLBAR_400 = new Set(["great-vibes", "mansalva", "parisienne", "marck-script"]); // Schriften nur in Regular (kein Fett)

function abdunkeln(hex: string, f = 0.62) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * f).toString(16).padStart(2, "0");
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

export default function WandKonfigurator() {
  const [schriftId, setSchriftId] = useState(WAND_SCHRIFTEN[0].id);
  const [schriftOv, setSchriftOv] = useState<(string | null)[]>([null, null, null]); // null = wie Zeile 1
  const [farbeId, setFarbeId] = useState("schwarz");
  const [cm, setCm] = useState(15);
  const [cmOv, setCmOv] = useState<(number | null)[]>([null, null, null]); // null = wie Zeile 1
  const [aktiv, setAktiv] = useState(0);
  const [oberflaecheId, setOberflaecheId] = useState("glatt");
  const [schreibweise, setSchreibweise] = useState<"eingabe" | "erster-gross">("eingabe");
  const oberflaeche = OBERFLAECHEN.find((o) => o.id === oberflaecheId)!;
  const [farbeOv, setFarbeOv] = useState<(string | null)[]>([null, null, null]); // null = wie Zeile 1

  const [texte, setTexte] = useState(["Willkommen", "", ""]);
  const [anzahl, setAnzahl] = useState(1); // sichtbare Textfelder (1 bis 3)
  const zeilen = useMemo(() => texte.slice(0, anzahl).map((z) => z.replace(/[^\p{L}\p{N} .,!&'-]/gu, "").slice(0, 20)), [texte, anzahl]);
  const leer = zeilen.every((z) => !z.trim());
  const eintraege = zeilen.map((z, i) => ({ z, i })).filter((e) => e.z.trim()); // Zeilen mit Text (Feld-Index bleibt erhalten)
  const zwei = eintraege.length > 1; // mehr als eine Zeile mit Text
  const akt = zwei ? (eintraege.some((e) => e.i === aktiv) ? aktiv : eintraege[0].i) : (eintraege[0]?.i ?? 0);
  const ids = [0, 1, 2].map((i) => (i === 0 ? schriftId : schriftOv[i] ?? schriftId));
  const cms = [0, 1, 2].map((i) => (i === 0 ? cm : cmOv[i] ?? cm));
  const farbIds = [0, 1, 2].map((i) => (i === 0 ? farbeId : farbeOv[i] ?? farbeId));
  const farbeVon = (i: number) => FARBEN.find((f) => f.id === farbIds[i])!;
  const gesetzt = (i: number, v: string) => setTexte((t) => t.map((x, k) => (k === i ? v.slice(0, 20) : x)));
  const mitSchreibweise = eintraege.some((e) => SCHREIBSCHRIFTEN.has(ids[e.i]));
  const zeilenF = zeilen.map((z, i) => (schreibweise === "erster-gross" && SCHREIBSCHRIFTEN.has(ids[i]) ? ersterGross(z) : z));
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
  const entwurf = `Wandbuchstaben-Entwurf aus dem Konfigurator: ${zwei ? eintraege.map((e) => beschr(e.i)).join("; ") : `„${(zeilenF[akt] ?? "").trim()}“ in ${schriftVon(akt).name}, Höhe der Großbuchstaben ${cms[akt]} cm, Farbe ${farbeVon(akt).name}`}, Oberfläche ${oberflaeche.name}${mitSchreibweise ? `, Schreibweise ${schreibweise === "erster-gross" ? "erster Buchstabe groß, Rest klein" : "genau wie eingegeben"}` : ""}, Breite ca. ${Math.round(breiteCm)} cm. Bitte um ein Angebot.`;
  const href = `/3d-druck/anfrage?entwurf=${encodeURIComponent(entwurf)}`;
  const markierung = (s: string) => ({ ["--wk-font" as string]: s });

  return (
    <section className="shop-bk shop-wk" aria-labelledby="wk-titel">
      <div className="shop-bk-kopf">
        <p className="shop-overline">Konfigurator · Wandbuchstaben</p>
        <h1 id="wk-titel">Dein Wort an der Wand</h1>
        <p className="shop-bk-sub">Tipp dein Wort ein, wähle Schrift, Farbe und Höhe. Die Vorschau zeigt die Buchstaben maßstäblich an einer Wand. Bestellen geht noch nicht: Du kannst deinen Entwurf als Anfrage an mich schicken und bekommst ein Angebot per E-Mail.</p>
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
                  onChange={(e) => gesetzt(i, e.target.value)} style={{ textTransform: "none", letterSpacing: "normal", flex: 1 }}
                />
                {i > 0 && i === anzahl - 1 && (
                  <button type="button" className="shop-bk-link" aria-label={`Zeile ${i + 1} entfernen`} onClick={() => { gesetzt(i, ""); setAnzahl(i); setAktiv(0); }}>Entfernen</button>
                )}
              </div>
            ))}
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
            <legend>Farbe{zwei ? ` (Zeile ${eintraege.findIndex((e) => e.i === akt) + 1})` : ""}</legend>
            <div className="shop-swatches">
              {FARBEN.map((f) => (
                <label key={f.id} className="shop-swatch" title={f.name}>
                  <input type="radio" name="wk-farbe" aria-label={f.name} checked={farbIds[akt] === f.id} onChange={() => setzeFarbe(f.id)} />
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
            <legend>Höhe der Großbuchstaben{zwei ? ` (Zeile ${eintraege.findIndex((e) => e.i === akt) + 1})` : ""}</legend>
            <div className="shop-options">
              {HOEHEN.map((h) => (
                <label key={h} className="shop-option"><input type="radio" name="wk-hoehe" checked={aktCm === h} onChange={() => setzeCm(h)} /><span>{h} cm</span></label>
              ))}
            </div>
          </fieldset>

          <div className="shop-bk-summe">
            <div>
              <strong>ca. {Math.round(breiteCm)} cm breit</strong>
              <span>Preis nach Angebot, unverbindlich</span>
            </div>
            <Link className="shop-btn" href={href} aria-disabled={leer || undefined}>Entwurf anfragen</Link>
          </div>
          <p className="shop-bk-klein">Die Vorschau ist eine Darstellung. Farbton, Glanz und feine Schriftdetails können beim Druck leicht abweichen. Dünne Linien (Schreibschriften, Serifen) brauchen eine Mindesthöhe, ich sage dir im Angebot, was bei deinem Wunsch geht.</p>
        </div>
      </div>
    </section>
  );
}
