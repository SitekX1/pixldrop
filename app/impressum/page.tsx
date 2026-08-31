import Link from "next/link";

export const metadata = { title: "Impressum â€” PixlDrop" };

export default function Impressum() {
  return (
    <div className="legal-page">
      <Link href="/" className="back">
        â† ZurÃ¼ck
      </Link>
      <h1>Impressum</h1>

      <p>Angaben gemÃ¤ÃŸ Â§ 5 TMG:</p>
      <p>
        Alexander Sitek
        <br />
        Richard-Strauss-StraÃŸe 4
        <br />
        86663 Asbach-BÃ¤umenheim
        <br />
        Deutschland
      </p>

      <p>
        <strong>Kontakt</strong>
        <br />
        E-Mail: <a href="mailto:as@sitekx.de">as@sitekx.de</a>
      </p>

      <p>
        <strong>Verantwortlich fÃ¼r den Inhalt nach Â§ 55 Abs. 2 RStV</strong>
        <br />
        Alexander Sitek (Anschrift wie oben)
      </p>

      <h2>Haftungsausschluss</h2>
      <p>
        <strong>Haftung fÃ¼r Inhalte:</strong> Als Diensteanbieter sind wir gemÃ¤ÃŸ Â§ 7 Abs. 1 TMG
        fÃ¼r eigene Inhalte auf dieser Website nach den allgemeinen Gesetzen verantwortlich. Nach
        Â§Â§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, Ã¼bermittelte oder
        gespeicherte fremde Informationen zu Ã¼berwachen oder nach UmstÃ¤nden zu forschen, die auf
        eine rechtswidrige TÃ¤tigkeit hinweisen.
      </p>
      <p>
        <strong>Haftung fÃ¼r Links:</strong> Diese Website enthÃ¤lt Links zu externen Websites
        Dritter (u. a. Spotify, TikTok, Instagram, YouTube, aicut.pro), auf deren Inhalte wir
        keinen Einfluss haben. FÃ¼r diese fremden Inhalte kÃ¶nnen wir daher keine GewÃ¤hr
        Ã¼bernehmen. FÃ¼r die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder
        Betreiber der Seiten verantwortlich.
      </p>
      <p>
        Einige der auf dieser Seite verlinkten Angebote sind Affiliate-Links (z. B. zu
        aicut.pro). Bei einer Registrierung oder einem Kauf Ã¼ber diesen Link kÃ¶nnen wir eine
        Provision erhalten, ohne dass fÃ¼r dich dadurch zusÃ¤tzliche Kosten entstehen.
      </p>
    </div>
  );
}
