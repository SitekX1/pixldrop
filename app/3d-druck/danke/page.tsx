import Link from "next/link";
import ShopShell from "@/components/shop/ShopShell";
import EddieSchnitt from "@/components/shop/EddieSchnitt";
import Ring from "@/components/shop/Ring";
import { bestellnummerOk } from "@/lib/shop/client";
import BestellungAbschluss from "@/components/shop/BestellungAbschluss";

export const metadata = { title: "Abgestellt." };

// Höhepunkt der Signature: Der Ring zeichnet sich in 700 ms um die Bestellnummer.
// Ohne Animation (Reduced Motion) steht er sofort. Anschrift wird nie angezeigt.
export default async function Danke({ searchParams }: { searchParams: Promise<{ nr?: string; hinweis?: string }> }) {
  const { nr, hinweis } = await searchParams;
  const echt = bestellnummerOk(nr);
  const nummer = echt ?? "VORSCHAU";
  return (
    <ShopShell>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <section className="shop-danke" aria-labelledby="titel">
          {!echt && (
            <p className="shop-demo" role="note"><strong>Vorschau:</strong> Das ist keine echte Bestellung. Hier fehlt eine gültige Bestellnummer.</p>
          )}
          {echt && <BestellungAbschluss />}
          {hinweis === "pruefung" && (
            <p className="shop-alert" role="status">Deine Zahlung ist eingegangen, wird aber noch kurz geprüft. Du bekommst eine E-Mail von mir. Bitte bestelle nicht erneut.</p>
          )}
          <h1 id="titel">Abgestellt.</h1>
          <p className="shop-overline">Deine Bestellung</p>
          <div className="shop-nr">
            <Ring draw />
            <strong>Bestellung <span className="nr">{echt ? nummer : "#VORSCHAU"}</span></strong>
          </div>
          <section aria-labelledby="jetzt" style={{ display: "grid", gap: 10 }}>
            <h2 id="jetzt" style={{ fontSize: "1.25rem" }}>Was jetzt passiert</h2>
            <ol className="shop-steps">
              <li><strong>Bestätigung per E-Mail</strong>Mit AGB, Widerrufsbelehrung und Muster-Widerrufsformular.</li>
              <li><strong>Zahlung</strong>Du hast per PayPal bezahlt. Den Beleg schickt dir PayPal.</li>
              <li><strong>Druck und Versand</strong>Lieferzeit: folgt. Ich druck und verpacke selbst.</li>
            </ol>
          </section>
          <EddieSchnitt className="shop-eddie-mini" />
          <Link className="shop-btn" href="/3d-druck#stuecke">Zurück zu den Stücken</Link>
        </section>
      </div>
    </ShopShell>
  );
}
