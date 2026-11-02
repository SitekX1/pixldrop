import Schneefall from "./Schneefall";

// Kulisse hinter dem Inhalt: nur im Ton "nacht" Schnee. Ton "papier" (Warenkorb, Bestellung, Anfrage, Rechtstexte): keine Kulisse.
export default function WeihnachtenKulisse({ ton }: { ton: "nacht" | "papier" }) {
  if (ton !== "nacht") return null;
  return <Schneefall />;
}
