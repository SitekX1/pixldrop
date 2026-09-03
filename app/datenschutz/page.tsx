import Link from "next/link";

export const metadata = { title: "Datenschutz — PixlDrop" };

export default function Datenschutz() {
  return (
    <div className="legal-page">
      <Link href="/" className="back">
        ← Zurück
      </Link>
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p>
        Alexander Sitek
        <br />
        Richard-Strauss-Straße 4
        <br />
        86663 Asbach-Bäumenheim
        <br />
        E-Mail: <a href="mailto:as@sitekx.de">as@sitekx.de</a>
      </p>

      <h2>2. Hosting</h2>
      <p>
        Diese Website wird bei Vercel Inc. gehostet. Beim Aufruf der Seite verarbeitet Vercel
        automatisch technische Daten (u. a. IP-Adresse, Zeitpunkt des Zugriffs, verwendeter
        Browser), die zum Betrieb und zur Sicherheit der Website notwendig sind (sog.
        Server-Logfiles). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
        am sicheren und stabilen Betrieb der Website).
      </p>

      <h2>3. Reichweitenmessung (Klick-Statistik)</h2>
      <p>
        Wir zählen, wie oft bestimmte Links auf dieser Seite angeklickt werden (z. B.
        Musik-Links, Social-Media-Links, aicut-Link), um zu sehen, welche Inhalte gut ankommen.
        Dabei wird nur der Klick selbst mit Zeitstempel gespeichert, keine IP-Adresse, keine
        Cookies und kein personenbezogenes Nutzerprofil. Die Daten werden bei Supabase Inc.
        (Serverstandort EU/Irland) gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an der Analyse und Verbesserung unseres Angebots).
      </p>

      <h2>4. Eingebettete Inhalte Dritter</h2>
      <p>
        Auf dieser Seite sind Musik-Player von Spotify eingebettet. Beim Laden eines
        eingebetteten Spotify-Players kann Spotify (Spotify AB) technische Daten wie deine
        IP-Adresse verarbeiten. Wir haben auf Art und Umfang dieser Verarbeitung keinen Einfluss.
        Weitere Informationen findest du in der{" "}
        <a href="https://www.spotify.com/de/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Spotify
        </a>
        .
      </p>

      <h2>5. Affiliate-Links</h2>
      <p>
        Diese Seite enthält einen Affiliate-Link zu aicut.pro. Beim Klick auf diesen Link wird
        ggf. ein Tracking-Parameter an den Anbieter übermittelt, damit dieser eine Vermittlung
        durch uns nachvollziehen kann. Es werden dabei keine personenbezogenen Daten von uns
        weitergegeben.
      </p>

      <h2>6. Minispiel &quot;Eddie&apos;s Café&quot;</h2>
      <p>
        Auf unserer Unterseite /pixlgame kannst du ein kleines Browserspiel spielen und deinen
        Punktestand in einer öffentlichen Rangliste eintragen. Dabei speichern wir den von dir
        frei gewählten Spielernamen (kein Klarname erforderlich), deinen erzielten Punktestand
        und das Datum der Runde. Diese Angaben werden bei Supabase Inc. (Serverstandort
        EU/Irland) gespeichert und öffentlich in der Rangliste (Top 100) angezeigt. Die
        Speicherung und Veröffentlichung erfolgt ausschließlich, wenn du vor dem Absenden
        ausdrücklich über eine Checkbox zustimmst. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a
        DSGVO (Einwilligung). Du kannst deine Einwilligung jederzeit für die Zukunft
        widerrufen und die Löschung deines Ranglisteneintrags über die oben genannte
        Kontaktadresse verlangen.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung deiner personenbezogenen
        Daten. Wende dich dazu an die oben genannte Kontaktadresse. Zudem steht dir ein
        Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu.
      </p>
    </div>
  );
}
