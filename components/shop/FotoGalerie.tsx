"use client";
import { useEffect, useRef, useState } from "react";
import type { Form } from "@/lib/shop/produkte";
import type { Foto } from "@/lib/shop/fotos";
import { LiveProductImage, useVorschauWerte } from "./Vorschau";

// Galerie-Hauptbild: echte Fotos als Blättergalerie, dazu die Live-Vorschau ("Deine Wahl").
// Tippt der Kunde einen Wunschtext, springt die Anzeige automatisch auf die Live-Vorschau.
export default function FotoGalerie({ form, grundfarbe, fotos, name }: { form: Form; grundfarbe: string; fotos: Foto[]; name: string }) {
  const w = useVorschauWerte();
  const [idx, setIdx] = useState(0); // -1 = Live-Vorschau
  // Der Standardtext (z. B. "Eddie Pixldrop") zählt nicht: erst eine Änderung durch den Kunden schaltet um.
  const start = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!w.text) return;
    if (start.current === undefined) { start.current = w.text; return; }
    if (w.text !== start.current) setIdx(-1);
  }, [w.text]);
  const foto = idx >= 0 ? fotos[idx] : null;
  return (
    <div>
      {foto ? (
        <div className="shop-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="shop-foto" src={foto.src} alt={foto.alt} width={1100} height={1100} decoding="async" />
        </div>
      ) : (
        <LiveProductImage form={form} grundfarbe={grundfarbe} />
      )}
      <div className="shop-fotoleiste" role="group" aria-label={`Bilder von ${name}`}>
        {fotos.map((f, i) => (
          <button key={f.src} type="button" aria-pressed={idx === i} aria-label={`Bild ${i + 1}: ${f.alt}`} onClick={() => setIdx(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.src} alt="" width={96} height={96} loading="lazy" decoding="async" />
          </button>
        ))}
        <button type="button" className="shop-fotoleiste-live" aria-pressed={idx === -1} onClick={() => setIdx(-1)}>Deine Wahl<br />Live</button>
      </div>
      {foto && <p className="shop-fotohinweis">Foto: Beispielstück. Farben und Text deiner Wahl siehst du unter „Deine Wahl Live“.</p>}
    </div>
  );
}
