"use client";
// Bubble-Konfigurator: Name eintippen, Höhe wählen, die Buchstaben erscheinen maßstäblich an einer Kinderzimmer-Wand
// (gerendert aus den echten STL-Dateien, public/shop/bubble/A..Z.webp). Die Farben folgen dem Coverbild
// und sind echte Lagerfarben, deshalb gibt es keine Farbwahl. Ein Klick legt alle Buchstaben in den Warenkorb.
import { useMemo, useState } from "react";
import Link from "next/link";
import masse from "@/lib/shop/bubble-masse.json";
import { KOMBI_KEY, type Produkt } from "@/lib/shop/produkte";
import { fuegeHinzu, ladeKorb, speichereKorb } from "@/lib/shop/auswahl";
import { formatPreis } from "@/lib/shop/config";

type Masse = Record<string, { breiteMm: number; hoeheMm: number; pxBreite: number; pxHoehe: number; padPx: number }>;
const M = masse as Masse;
const H_PX = 360; // Sprite-Höhe für 60 mm Buchstabenhöhe (siehe Renderskript)
const MAX_ZEICHEN = 12;

// Reihenfolge wie auf dem Cover (Dunkelblau, Petrol, Orange, Hellblau, Rosa, Flieder), aber mit den echten Lagerfarben.
const PALETTE: { id: string; name: string; hex: string }[] = [
  { id: "cyan", name: "Cyan", hex: "#1f8fd6" },
  { id: "tuerkis", name: "Türkis", hex: "#00acc1" },
  { id: "sunny-orange", name: "Orange", hex: "#ed7334" },
  { id: "hellblau", name: "Hellblau", hex: "#4fc3f7" },
  { id: "hellbeige", name: "Hautton", hex: "#f6dfc6" },
  { id: "violett", name: "Violett", hex: "#7b1fa2" },
];

export default function BubbleKonfigurator({ produkt, farbenAus, bestellbar }: { produkt: Produkt; farbenAus: string[]; bestellbar: boolean }) {
  const hoehen = useMemo(() => {
    const g = produkt.optionen.find((o) => o.id === "hoehe")!;
    return g.optionen.map((o) => ({ id: o.id, cm: parseInt(o.label, 10), cent: (produkt.preisCent ?? 0) + (o.aufpreisCent ?? 0) }));
  }, [produkt]);
  const [text, setText] = useState("LENA");
  const [hid, setHid] = useState("h8");
  const [glatt, setGlatt] = useState(true);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const h = hoehen.find((x) => x.id === hid)!;

  const frei = PALETTE.filter((p) => !farbenAus.includes(p.id));
  const palette = frei.length ? frei : PALETTE;

  // Eingabe: nur A-Z und Leerzeichen (Zahlen/Zeichen werden unten einzeln bestellt)
  const sauber = text.toUpperCase().replace(/[^A-Z ]/g, "").replace(/ +/g, " ").slice(0, MAX_ZEICHEN);
  const ignoriert = text.length > 0 && text.toUpperCase().replace(/ /g, "").replace(/[A-Z]/g, "").length > 0;

  const zeichen = useMemo(() => {
    let k = 0;
    return [...sauber].map((c) => (c === " " ? { c, farbe: null as null | (typeof PALETTE)[number] } : { c, farbe: palette[k++ % palette.length] }));
  }, [sauber, palette]);

  // Maße in cm: Sprite-Breite = pxBreite/H_PX * Höhe
  const cmB = (c: string) => (M[c].pxBreite / H_PX) * h.cm;
  const cmH = (c: string) => (M[c].pxHoehe / H_PX) * h.cm;
  const gesamtCm = zeichen.reduce((s, z) => s + (z.c === " " ? h.cm * 0.55 : cmB(z.c)), 0);
  const wandCm = Math.max(70, Math.ceil((gesamtCm * 1.35) / 10) * 10);
  const proz = (cm: number) => `${(cm / wandCm) * 100}cqw`;
  const anzahl = zeichen.filter((z) => z.farbe).length;
  const summeCent = anzahl * h.cent;
  const massstab = wandCm <= 80 ? 10 : wandCm <= 120 ? 20 : wandCm <= 250 ? 50 : 100;

  function inKorb() {
    if (!anzahl || !bestellbar) return;
    let korb = ladeKorb();
    const zaehler = new Map<string, { c: string; farbe: string; n: number }>();
    for (const z of zeichen) {
      if (!z.farbe) continue;
      const key = `${z.c}|${z.farbe.id}`;
      const e = zaehler.get(key);
      if (e) e.n++; else zaehler.set(key, { c: z.c, farbe: z.farbe.id, n: 1 });
    }
    for (const e of zaehler.values()) {
      const r = fuegeHinzu(korb, {
        slug: produkt.slug, farbeId: null,
        optionen: { hoehe: hid, zeichen: e.c.toLowerCase(), oberflaeche: glatt ? "glatt" : "struktur", [KOMBI_KEY]: e.farbe },
        text: "", schriftId: null, menge: e.n,
      });
      if (!r.ok) { setMeldung({ ok: false, text: "Der Warenkorb ist voll (höchstens 20 verschiedene Positionen). Bestelle bitte in zwei Runden." }); return; }
      korb = r.korb;
    }
    speichereKorb(korb);
    setMeldung({ ok: true, text: `${anzahl} Buchstaben liegen im Warenkorb.` });
  }

  return (
    <section className="shop-bk" aria-labelledby="bk-titel">
      <div className="shop-bk-kopf">
        <p className="shop-overline">Konfigurator</p>
        <h2 id="bk-titel">Dein Name an der Wand</h2>
        <p className="shop-bk-sub">Tipp deinen Namen oder ein Wort ein und wähle die Höhe. So groß werden die Buchstaben wirklich, gerechnet nach meinen Druckdateien. Die Farben sind wie auf dem Titelbild.</p>
      </div>

      <div className="shop-bk-raster">
        <div className="shop-bk-wand" role="img" aria-label={`Vorschau: ${sauber || "dein Wort"} in ${h.cm} cm Höhe an einer Kinderzimmer-Wand`}>
          <div className="shop-bk-bild" style={{ ["--wand-cm" as string]: wandCm }}>
            <div className="shop-bk-reihe" style={{ gap: 0 }}>
              {zeichen.length === 0 && <span className="shop-bk-leer">Gib oben einen Namen ein</span>}
              {zeichen.map((z, i) =>
                z.farbe ? (
                  <span
                    key={i} className="shop-bk-b"
                    style={{
                      width: proz(cmB(z.c)), height: proz(cmH(z.c)),
                      backgroundImage: `url(/shop/bubble/${z.c}.webp)`, backgroundColor: z.farbe.hex,
                      WebkitMaskImage: `url(/shop/bubble/${z.c}.webp)`, maskImage: `url(/shop/bubble/${z.c}.webp)`,
                    }}
                  />
                ) : <span key={i} style={{ width: proz(h.cm * 0.55), height: 1 }} />,
              )}
            </div>
            <div className="shop-bk-massstab" aria-hidden="true">
              <i style={{ width: proz(massstab) }} /><span>{massstab} cm</span>
            </div>
          </div>
        </div>

        <div className="shop-bk-steuer">
          <label className="shop-bk-feld">
            <span>Dein Wort oder Name <em>(bis {MAX_ZEICHEN} Zeichen, A bis Z)</em></span>
            <input className="shop-input" value={text} maxLength={MAX_ZEICHEN + 6} autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={(e) => { setText(e.target.value); setMeldung(null); }} />
          </label>
          {ignoriert && <p className="shop-bk-hinweis">Hier gehen nur Buchstaben von A bis Z. Zahlen, Satzzeichen und Umlaute bestellst du darunter einzeln.</p>}

          <fieldset className="shop-bk-feld">
            <legend>Höhe</legend>
            <div className="shop-options">
              {hoehen.map((x) => (
                <label key={x.id} className="shop-option">
                  <input type="radio" name="bk-hoehe" checked={hid === x.id} onChange={() => { setHid(x.id); setMeldung(null); }} />
                  <span>{x.cm} cm</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="shop-bk-feld">
            <legend>Oberfläche</legend>
            <div className="shop-options">
              <label className="shop-option"><input type="radio" name="bk-ob" checked={glatt} onChange={() => setGlatt(true)} /><span>Glatt</span></label>
              <label className="shop-option"><input type="radio" name="bk-ob" checked={!glatt} onChange={() => setGlatt(false)} /><span>Struktur</span></label>
            </div>
          </fieldset>

          <div className="shop-bk-summe">
            <div>
              <strong>{anzahl > 0 ? formatPreis(summeCent) : "–"}</strong>
              <span>{anzahl} Buchstaben × {formatPreis(h.cent)} · zusammen etwa {Math.round(gesamtCm)} cm breit</span>
            </div>
            <button type="button" className="shop-btn" disabled={!anzahl || !bestellbar} onClick={inKorb}>Alle in den Warenkorb</button>
          </div>
          {meldung && (
            <p className={meldung.ok ? "shop-note" : "shop-note shop-note--warn"} role="status" aria-live="polite">
              {meldung.text} {meldung.ok && <Link className="shop-link" href="/3d-druck/warenkorb">Zum Warenkorb</Link>}
            </p>
          )}
          <p className="shop-bk-klein">Jeder Buchstabe wird einzeln gedruckt und kommt als eigene Position in den Warenkorb. Farbe, Höhe und Anordnung kannst du dort noch ansehen. Die Vorschau ist eine Darstellung, Farbton und Glanz können in echt leicht abweichen.</p>
        </div>
      </div>
    </section>
  );
}
