import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";
import { Abschnitt } from "@/components/shop/RechtText";
import { ENTWURF_MODUS, entwurfTitel } from "@/lib/shop/config";
import { agbAbschnitte, AGB_TITEL } from "@/lib/shop/agb-daten";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";

export const dynamic = "force-dynamic"; // Lieferzeit kommt aus den Shop-Einstellungen
export const metadata = { title: entwurfTitel("AGB") };

// Text steht in lib/shop/agb-daten.ts (einzige Quelle, auch fuer den Klartext der Bestaetigungsmail).
// Entwurf-Hinweise hängen am Schalter ENTWURF_MODUS (lib/shop/config.ts).
export default async function Agb() {
  const AGB_ABSCHNITTE = agbAbschnitte((await holeEinstellungen()).lieferzeit);
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>{AGB_TITEL}</h1>
          {ENTWURF_MODUS && <p className="muted">Entwurf, noch nicht rechtsverbindlich.</p>}
          {AGB_ABSCHNITTE.map((s) => <Abschnitt key={s.titel} titel={s.titel} absaetze={s.a} />)}
          <p>Impressum und Datenschutzerklärung findest du im Fuß der Seite.</p>
        </article>
      </div>
    </ShopShell>
  );
}
