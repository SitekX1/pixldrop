import SchneeCanvas from "./SchneeCanvas";

// Kulisse über dem Inhalt: nur im Ton "nacht" Schnee (Canvas, echte Kristalle). Ton "papier" (Warenkorb, Bestellung, Anfrage, Rechtstexte): kein Schnee.
// Die alte CSS-Schneefall-Komponente (Schneefall.tsx) und die SVG-Szene (WeihnachtenHimmel, Schlitten, WeihnachtenSvgs) bleiben im Code, werden aber nicht mehr verwendet.
export default function WeihnachtenKulisse({ ton }: { ton: "nacht" | "papier" }) {
  if (ton !== "nacht") return null;
  return <SchneeCanvas />;
}
