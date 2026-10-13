"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NS, NS_BREITE, NS_STAENDER, NS_UMRISS, kappeJeEm, nameKappe, titelKappe } from "@/lib/shop/namensschild";

// Das fertige Namensschild von vorn, maßstabsgetreu aus der Druckdatei (Umriss, Ständer, Balken, Schriftposition).
// Der Name füllt die Breite (höchstens NS.nameKappeMax), der Titel hat feste Höhe und wird nur verkleinert: dieselbe
// Regel wie im Druckwerkzeug (tools/textplatte). Die Textbreite wird im Browser mit der echten Schrift gemessen
// (Kerning, Ligaturen), damit die Vorschau dem Druck entspricht.

const MESS_SIZE = 100;
const Y = (y: number) => 48 - y; // Druckkoordinate (y nach oben) -> SVG (y nach unten)

export interface ZeileFormat { fett: boolean; kursiv: boolean }

export default function NamensschildSvg({
  name, titel, schriftId, family, platte, schrift, fmtName, fmtTitel, breiteEm,
}: {
  name: string; titel: string; schriftId: string; family: string; platte: string; schrift: string;
  fmtName: ZeileFormat; fmtTitel: ZeileFormat; /** Schätzwert Zeichenbreite (em) bis die Messung vorliegt */ breiteEm: number;
}) {
  const kappe = kappeJeEm(schriftId);
  const refName = useRef<SVGTextElement>(null);
  const refTitel = useRef<SVGTextElement>(null);
  // gemessene Textbreite in mm bei Kappenhöhe 1 mm (null = noch nicht gemessen)
  const [mess, setMess] = useState<{ name: number | null; titel: number | null }>({ name: null, titel: null });
  const [fontTick, setFontTick] = useState(0);

  useEffect(() => {
    const f = typeof document !== "undefined" ? document.fonts : undefined;
    if (!f) return;
    const hoch = () => setFontTick((t) => t + 1);
    f.ready.then(hoch).catch(() => {});
    f.addEventListener?.("loadingdone", hoch);
    return () => f.removeEventListener?.("loadingdone", hoch);
  }, []);

  useLayoutEffect(() => {
    const mass = (el: SVGTextElement | null) => {
      if (!el) return null;
      try {
        const w = el.getComputedTextLength();
        return w > 0 ? w / (MESS_SIZE * kappe) : null; // mm je 1 mm Kappenhöhe
      } catch { return null; }
    };
    setMess((alt) => {
      const neu = { name: mass(refName.current), titel: mass(refTitel.current) };
      return alt.name === neu.name && alt.titel === neu.titel ? alt : neu;
    });
  }, [name, titel, family, fmtName.fett, fmtName.kursiv, fmtTitel.fett, fmtTitel.kursiv, kappe, fontTick]);

  const schaetz = (t: string, fett: boolean) => Math.max(1, t.length) * breiteEm * (fett ? 1.08 : 1) / kappe;
  const kName = nameKappe(mess.name ?? schaetz(name, fmtName.fett));
  const kTitel = titelKappe(mess.titel ?? schaetz(titel, fmtTitel.fett));
  const stil = (f: ZeileFormat) => ({ fontFamily: family, fontWeight: f.fett ? 700 : 400, fontStyle: f.kursiv ? "italic" : "normal" } as const);

  // Zeichnung: 196,5 x 61 mm in die 100er-Fläche einpassen
  const s = 94 / 196.5;
  const hoehe = (48 + NS_STAENDER.hoehe) * s;
  const umriss = NS_UMRISS.map(([x, y]) => `${x},${Y(y)}`).join(" ");
  return (
    <g transform={`translate(3 ${(100 - hoehe) / 2}) scale(${s})`}>
      <rect x={NS_STAENDER.x} y={Y(0)} width={NS_STAENDER.breite} height={NS_STAENDER.hoehe} rx="2" fill={platte} stroke="rgba(0,0,0,.3)" strokeWidth="0.8" />
      <polygon points={umriss} fill={platte} stroke="rgba(0,0,0,.3)" strokeWidth="0.8" strokeLinejoin="round" />
      <rect x={NS.zoneL} y={Y(NS.balkenOben)} width={NS_BREITE} height={NS.balkenOben - NS.balkenUnten} fill={schrift} />
      <text x={NS.mitte} y={Y(NS.nameGrundlinie)} textAnchor="middle" fontSize={kName / kappe} fill={schrift} style={stil(fmtName)}>{name}</text>
      <text x={NS.mitte} y={Y(NS.titelGrundlinie)} textAnchor="middle" fontSize={kTitel / kappe} fill={schrift} style={stil(fmtTitel)}>{titel}</text>
      {/* unsichtbare Messtexte (feste Größe), liefern die echte Textbreite der gewählten Schrift */}
      <text ref={refName} x="0" y="0" fontSize={MESS_SIZE} visibility="hidden" style={stil(fmtName)}>{name}</text>
      <text ref={refTitel} x="0" y="0" fontSize={MESS_SIZE} visibility="hidden" style={stil(fmtTitel)}>{titel}</text>
    </g>
  );
}
