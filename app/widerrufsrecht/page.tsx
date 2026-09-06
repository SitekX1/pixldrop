import Link from "next/link";

export const metadata = { title: "Widerrufsrecht — PixlDrop" };

export default function Widerrufsrecht() {
  return (
    <div className="legal-page">
      <Link href="/" className="back">
        ← Zurück
      </Link>
      <h1>Widerrufsbelehrung</h1>

      <p>
        Diese Widerrufsbelehrung gilt für den Kauf personalisierter Grußvideos (digitale
        Inhalte, nicht auf einem körperlichen Datenträger) über pixldrop.de.
      </p>

      <h2>Widerrufsrecht</h2>
      <p>
        Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
        widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.
      </p>
      <p>
        Um dein Widerrufsrecht auszuüben, musst du uns (Alexander Sitek, Richard-Strauss-Straße
        4, 86663 Asbach-Bäumenheim, E-Mail: <a href="mailto:as@sitekx.de">as@sitekx.de</a>)
        mittels einer eindeutigen Erklärung (z. B. per E-Mail) über deinen Entschluss, diesen
        Vertrag zu widerrufen, informieren. Du kannst dafür das unten stehende
        Muster-Widerrufsformular verwenden, dies ist aber nicht vorgeschrieben.
      </p>

      <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
      <p>
        Dein Widerrufsrecht erlischt vorzeitig, wenn wir mit der Erstellung und Bereitstellung
        deines Videos begonnen haben, nachdem du ausdrücklich zugestimmt hast, dass wir vor
        Ablauf der Widerrufsfrist mit der Ausführung des Vertrags beginnen, und du deine
        Kenntnis davon bestätigt hast, dass du durch deine Zustimmung mit Beginn der Ausführung
        des Vertrags dein Widerrufsrecht verlierst. Diese Zustimmung holen wir vor der
        Bestellung gesondert ein.
      </p>

      <h2>Muster-Widerrufsformular</h2>
      <p>(Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular aus und sende es zurück.)</p>
      <p>
        An: Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim, E-Mail:{" "}
        <a href="mailto:as@sitekx.de">as@sitekx.de</a>
        <br />
        — Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf des
        folgenden Grußvideos:
        <br />
        — Bestellt am:
        <br />
        — Name des/der Verbraucher(s):
        <br />
        — Anschrift des/der Verbraucher(s):
        <br />
        — Datum:
      </p>
    </div>
  );
}
