"use client";
// Konfigurator für Wandbuchstaben in Schrift (Design-Buchstaben): Wort eintippen, Schrift, Farbe und Höhe wählen,
// Vorschau an einer weißen Wand mit Kommode, maßstäblich (Höhe der Großbuchstaben in cm, die Schrift wird real gemessen).
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
const EINSTELLBAR_400 = new Set(["great-vibes", "mansalva"]); // Schriften nur in Regular (kein Fett)

function abdunkeln(hex: string, f = 0.62) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * f).toString(16).padStart(2, "0");
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

export default function WandKonfigurator() {
  const [text, setText] = useState("Willkommen");
  const [schriftId, setSchriftId] = useState(WAND_SCHRIFTEN[0].id);
  const [farbeId, setFarbeId] = useState("schwarz");
  const [cm, setCm] = useState(15);
  const schrift = WAND_SCHRIFTEN.find((s) => s.id === schriftId)!;
  const farbe = FARBEN.find((f) => f.id === farbeId)!;
  const gewicht = EINSTELLBAR_400.has(schriftId) ? 400 : 700;

  const zeilen = useMemo(() => text.replace(/[^\p{L}\p{N} .,!&'\n-]/gu, "").split("\n").slice(0, 2).map((z) => z.slice(0, 20)), [text]);
  const leer = zeilen.every((z) => !z.trim());

  // Echte Höhe der Großbuchstaben (Anteil der Schriftgröße) per Messung, damit "15 cm" auch bei Schreibschriften stimmt
  const textRef = useRef<HTMLDivElement>(null);
  const bildRef = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState(0.7);
  useEffect(() => {
    let weg = false;
    (async () => {
      const el = textRef.current;
      if (!el) return;
      const ff = getComputedStyle(el).fontFamily;
      try { await document.fonts.load(`${gewicht} 100px ${ff}`, "H"); } catch { /* egal, Messung mit Ersatzschrift */ }
      const c = document.createElement("canvas").getContext("2d");
      if (!c) return;
      c.font = `${gewicht} 100px ${ff}`;
      const r = c.measureText("H").actualBoundingBoxAscent / 100;
      if (!weg && r > 0.2 && r < 1.2) setCap(r);
    })();
    return () => { weg = true; };
  }, [schriftId, gewicht]);

  // Wandbreite so wählen, dass der Text hineinpasst (Maßstab bleibt in cm erhalten)
  const [wandCm, setWandCm] = useState(170);
  const [breiteCm, setBreiteCm] = useState(0);
  useLayoutEffect(() => {
    const t = textRef.current, b = bildRef.current;
    if (!t || !b) return;
    const messen = () => {
      const rel = t.getBoundingClientRect().width / b.getBoundingClientRect().width; // Anteil der Wandbreite
      const tcm = rel * wandCm;
      setBreiteCm(tcm);
      const soll = Math.max(150, Math.ceil((tcm * 1.35) / 10) * 10);
      if (soll !== wandCm) setWandCm(soll);
    };
    messen();
    const ro = new ResizeObserver(messen);
    ro.observe(t); ro.observe(b);
    return () => ro.disconnect();
  }, [zeilen, schriftId, cm, cap, wandCm]);

  const fontCm = cm / cap; // Schriftgröße in cm
  const cqw = (v: number) => `${(v / wandCm) * 100}cqw`;
  const dunkel = abdunkeln(farbe.hex);
  // Dicke ca. 10 mm: gestapelte Schatten nach rechts unten + weicher Wurf auf die Wand
  const tiefe = (k: number) => `${(k * 0.1) / wandCm * 100}cqw`;
  const schatten = [1, 2, 3, 4, 5, 6].map((k) => `${tiefe(k)} ${tiefe(k)} 0 ${dunkel}`).join(", ")
    + `, ${cqw(1.4)} ${cqw(2.2)} ${cqw(2.4)} rgba(40, 30, 20, .28)`;

  const entwurf = `Wandbuchstaben-Entwurf aus dem Konfigurator: „${zeilen.map((z) => z.trim()).filter(Boolean).join(" / ")}“, Schrift ${schrift.name}, Farbe ${farbe.name}, Höhe der Großbuchstaben ${cm} cm, Breite ca. ${Math.round(breiteCm)} cm. Bitte um ein Angebot.`;
  const href = `/3d-druck/anfrage?entwurf=${encodeURIComponent(entwurf)}`;
  const markierung = (s: string) => ({ ["--wk-font" as string]: s });

  return (
    <section className="shop-bk shop-wk" aria-labelledby="wk-titel">
      <div className="shop-bk-kopf">
        <p className="shop-overline">Konfigurator · Wandbuchstaben</p>
        <h1 id="wk-titel">Dein Wort an der Wand</h1>
        <p className="shop-bk-sub">Tipp dein Wort ein, wähle Schrift, Farbe und Höhe. Die Vorschau zeigt die Buchstaben maßstäblich an einer Wand. Bestellen geht noch nicht: Du kannst deinen Entwurf als Anfrage an mich schicken und bekommst ein Angebot per E-Mail.</p>
      </div>

      <div className="shop-bk-raster">
        <div className="shop-bk-wand" role="img" aria-label={`Vorschau: ${zeilen.join(" ")} in ${schrift.name}, ${cm} cm hoch`}>
          <div ref={bildRef} className="shop-bk-bild shop-wk-bild">
            <div className="shop-wk-text-feld">
              <div
                ref={textRef} className="shop-wk-text"
                style={{ fontFamily: schrift.family, fontWeight: gewicht, fontSize: cqw(fontCm), color: farbe.hex, textShadow: schatten, ...markierung(schrift.family) }}
              >
                {leer ? <span style={{ opacity: .35 }}>Dein Wort</span> : zeilen.map((z, i) => <div key={i}>{z || " "}</div>)}
              </div>
            </div>
            <div className="shop-wk-kommode" aria-hidden="true">
              <i className="shop-wk-vase" /><i className="shop-wk-buch" />
              <div className="shop-wk-korpus"><b /><b /><b /></div>
              <u /><u />
            </div>
            <div className="shop-bk-massstab" aria-hidden="true">
              <i style={{ width: cqw(50) }} /><span>50 cm</span>
            </div>
          </div>
        </div>

        <div className="shop-bk-steuer">
          <label className="shop-bk-feld">
            <span>Dein Wort <em>(bis 2 Zeilen, je 20 Zeichen)</em></span>
            <textarea className="shop-input" rows={2} value={text} onChange={(e) => setText(e.target.value.slice(0, 40))} spellCheck={false} style={{ textTransform: "none", letterSpacing: "normal", resize: "none" }} />
          </label>

          <fieldset className="shop-bk-feld">
            <legend>Schrift</legend>
            <div className="shop-wk-schriften">
              {WAND_SCHRIFTEN.map((s) => (
                <label key={s.id} className="shop-wk-schrift">
                  <input type="radio" name="wk-schrift" checked={schriftId === s.id} onChange={() => setSchriftId(s.id)} />
                  <span style={{ fontFamily: s.family, fontWeight: EINSTELLBAR_400.has(s.id) ? 400 : 700 }}>
                    <b>{(zeilen[0] || "Aa").trim().slice(0, 6) || "Aa"}</b>
                    <small>{s.name}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="shop-bk-feld">
            <legend>Farbe</legend>
            <div className="shop-swatches">
              {FARBEN.map((f) => (
                <label key={f.id} className="shop-swatch" title={f.name}>
                  <input type="radio" name="wk-farbe" aria-label={f.name} checked={farbeId === f.id} onChange={() => setFarbeId(f.id)} />
                  <span className="dot" style={{ background: f.hex }} />
                </label>
              ))}
            </div>
            <span className="shop-bk-klein">{farbe.name} · matt, PLA</span>
          </fieldset>

          <fieldset className="shop-bk-feld">
            <legend>Höhe der Großbuchstaben</legend>
            <div className="shop-options">
              {HOEHEN.map((h) => (
                <label key={h} className="shop-option"><input type="radio" name="wk-hoehe" checked={cm === h} onChange={() => setCm(h)} /><span>{h} cm</span></label>
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
