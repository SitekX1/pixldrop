import Link from "next/link";

export const metadata = { title: "Impressum — PixlDrop" };

export default function Impressum() {
  return (
    <div className="legal-page">
      <Link href="/" className="back">
        ← Zurück
      </Link>
      <h1>Impressum</h1>

      <p>Angaben gemäß § 5 TMG:</p>
      <p>
        Alex Sitek
        <br />
        Richard-Strauss-Straße 4
        <br />
        86663 Asbach-Bäumenheim
        <br />
        Deutschland
      </p>

      <p>
        <strong>Kontakt</strong>
        <br />
        E-Mail: <a href="mailto:as@sitekx.de">as@sitekx.de</a>
      </p>

      <p>
        <strong>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</strong>
        <br />
        Alex Sitek (Anschrift wie oben)
      </p>

      <h2>Haftungsausschluss</h2>
      <p>
        <strong>Haftung für Inhalte:</strong> Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG
        für eigene Inhalte auf dieser Website nach den allgemeinen Gesetzen verantwortlich. Nach
        §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
        gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf
        eine rechtswidrige Tätigkeit hinweisen.
      </p>
      <p>
        <strong>Haftung für Links:</strong> Diese Website enthält Links zu externen Websites
        Dritter (u. a. Spotify, TikTok, Instagram, YouTube, aicut.pro), auf deren Inhalte wir
        keinen Einfluss haben. Für diese fremden Inhalte können wir daher keine Gewähr
        übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder
        Betreiber der Seiten verantwortlich.
      </p>
      <p>
        Einige der auf dieser Seite verlinkten Angebote sind Affiliate-Links (z. B. zu
        aicut.pro). Bei einer Registrierung oder einem Kauf über diesen Link können wir eine
        Provision erhalten, ohne dass für dich dadurch zusätzliche Kosten entstehen.
      </p>
    </div>
  );
}
