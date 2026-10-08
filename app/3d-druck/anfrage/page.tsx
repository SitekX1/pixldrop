import ShopShell from "@/components/shop/ShopShell";
import AnfrageForm from "@/components/shop/AnfrageForm";
import { holeFarben } from "@/lib/shop/farben";

export const metadata = { title: "Individueller Druck – Preis nach Anfrage" };

export default async function Anfrage() {
  const farben = await holeFarben();
  return (
    <ShopShell>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <a className="shop-crumb" href="/3d-druck#stuecke">← Alle Stücke</a>
        <div style={{ display: "grid", gap: 14, margin: "8px 0 24px" }}>
          <p className="shop-overline">Individueller Druck · Preis nach Anfrage</p>
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Du hast eine Idee? Ich drucke sie.</h1>
          <p>Unverbindlich. Kein Preis jetzt, du bekommst ein Angebot per E-Mail.</p>
        </div>
        <AnfrageForm farben={farben} />
        <section className="shop-section" aria-labelledby="ablauf">
          <h2 id="ablauf">So läuft&rsquo;s</h2>
          <ol className="shop-steps">
            <li><strong>Anfrage</strong>Du beschreibst deine Idee, optional mit Maßen und Bildern.</li>
            <li><strong>Angebot per E-Mail</strong>Ich melde mich mit einem Preis, unverbindlich.</li>
            <li><strong>Zusage und Zahlung</strong>Erst wenn du zusagst, wird gedruckt.</li>
          </ol>
        </section>
      </div>
    </ShopShell>
  );
}
