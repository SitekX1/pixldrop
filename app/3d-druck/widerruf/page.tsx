import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";

export const metadata = { title: "Widerrufsbelehrung (Entwurf)" };

// PLATZHALTER: Es stehen bewusst keine Rechtstexte hier. Inhalt liefert Dr. Justus.
export default function WiderrufPlatzhalter() {
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Widerrufsbelehrung</h1>
          <p>Hier steht später die Widerrufsbelehrung für den 3D-Druck-Shop. Diese Seite ist ein Platzhalter.</p>
          <h2 style={{ fontSize: "1.25rem" }}>Vorgesehene Abschnitte</h2>
          <ul>
            <li>Widerrufsbelehrung</li><li>Hinweis zu individuell gefertigten Waren</li>
            <li>Muster-Widerrufsformular (später als kopierbarer Block)</li>
          </ul>
        </article>
      </div>
    </ShopShell>
  );
}
