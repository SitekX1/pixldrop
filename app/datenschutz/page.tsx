import Link from "next/link";
import LegalFooter from "@/components/LegalFooter";

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

      <h2>7. Anfragen für Grußvideos</h2>
      <p>
        Auf unserer Unterseite /gruss kannst du über ein Formular eine unverbindliche Anfrage
        für ein personalisiertes Grußvideo stellen. Dabei verarbeiten wir die von dir
        eingegebenen Angaben: deinen Namen, deine Kontaktdaten (E-Mail-Adresse oder
        Social-Media-Profilname), den gewünschten Anlass, den gewünschten Ton sowie deinen
        Freitext dazu, was im Video gesagt werden soll. Zweck ist ausschließlich die Bearbeitung
        deiner Anfrage, die Erstellung eines Preisangebots und die spätere Vertragsabwicklung.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher Maßnahmen
        bzw. Vertragserfüllung). Die Angaben werden bei Supabase Inc. (Serverstandort EU/Irland)
        gespeichert. Die Bereitstellung der Daten ist freiwillig, ohne sie können wir dir aber
        kein Angebot machen.
      </p>

      <h2>8. Benachrichtigung über Telegram</h2>
      <p>
        Damit wir neue Anfragen zeitnah bemerken, senden wir uns bei jeder eingehenden
        Grußvideo-Anfrage eine interne Benachrichtigung über den Messenger-Dienst Telegram. Dabei
        werden die von dir im Formular gemachten Angaben (Name, Kontaktdaten, Anlass, Ton,
        Freitext) an Telegram übermittelt. Anbieter ist die Telegram Messenger Inc. bzw. Telegram
        FZ-LLC (Dubai, Vereinigte Arabische Emirate); es findet somit eine Übermittlung in ein
        Drittland außerhalb der EU statt, für das kein Angemessenheitsbeschluss der EU-Kommission
        vorliegt. Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an einer zeitnahen Bearbeitung deiner Anfrage); Rechtsgrundlage
        für die Drittlandübermittlung selbst ist Art. 49 Abs. 1 lit. b DSGVO, da die
        Übermittlung zur Durchführung vorvertraglicher Maßnahmen auf deine Anfrage hin
        erforderlich ist. Wenn du diese Übermittlung nicht wünschst, kannst du uns deine Anfrage
        stattdessen direkt per E-Mail an die oben genannte Adresse senden.
      </p>

      <h2>9. Kontaktformular im Impressum</h2>
      <p>
        Über das Kontaktformular im <Link href="/impressum">Impressum</Link> kannst du uns
        unabhängig von einer Grußvideo-Anfrage direkt erreichen. Dabei verarbeiten wir deinen
        Namen, deine E-Mail-Adresse und deine Nachricht. Der Versand erfolgt über den
        SMTP-Server von <strong>IONOS SE</strong> (Elgendorfer Str. 57, 56410 Montabaur,
        Deutschland) an unsere oben genannte Kontaktadresse und wird dort zur Bearbeitung
        deiner Anfrage genutzt. Die Daten werden nicht an weitere Dritte weitergegeben.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
        Beantwortung von Anfragen) bzw., soweit deine Nachricht bereits eine vertragliche
        Anbahnung betrifft, Art. 6 Abs. 1 lit. b DSGVO. Die Angaben löschen wir, sobald deine
        Anfrage abschließend bearbeitet ist und keine gesetzlichen Aufbewahrungspflichten
        entgegenstehen.
      </p>

      <h2>10. Speicherdauer</h2>
      <p>
        Anfragen für Grußvideos bewahren wir so lange auf, wie es für die Bearbeitung und eine
        etwaige Vertragsabwicklung erforderlich ist; bei zustande gekommenen Verträgen gelten
        zusätzlich die gesetzlichen Aufbewahrungsfristen (bis zu 8 Jahre nach § 147 AO bzw.
        § 257 HGB). Anfragen, die zu keinem Vertrag führen, löschen wir spätestens nach sechs
        Monaten. Ranglisteneinträge aus dem Minispiel und die anonymen Klick-Statistiken
        speichern wir unbefristet, bis du der Speicherung widersprichst bzw. eine Löschung
        verlangst.
      </p>

      <h2>11. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung deiner personenbezogenen
        Daten. Wende dich dazu an die oben genannte Kontaktadresse. Zudem steht dir ein
        Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu. Soweit wir Daten auf Grundlage
        von Art. 6 Abs. 1 lit. f DSGVO verarbeiten, kannst du jederzeit aus Gründen, die sich
        aus deiner besonderen Situation ergeben, widersprechen (Art. 21 DSGVO). Zuständige
        Aufsichtsbehörde: Bayerisches Landesamt für Datenschutzaufsicht, Promenade 18, 91522
        Ansbach.
      </p>

      <h2>12. Online-Shop &bdquo;3D-Druck&ldquo;</h2>
      <p>
        Die folgenden Angaben gelten für den Shop unter /3d-druck. Verantwortlich ist der oben
        genannte Verantwortliche.
      </p>

      <h3>12.1 Bestellung und Vertragsabwicklung</h3>
      <p>
        Bei einer Bestellung verarbeiten wir Name, Lieferanschrift, E-Mail-Adresse, Bestellinhalt
        (Artikel, Farbe, ggf. Wunschtext und Schrift) und Hinweise von dir, um den Vertrag zu
        erfüllen: Auftrag prüfen und bestätigen, Zahlung abwickeln, drucken, versenden, Fragen
        beantworten. <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO. Ohne diese
        Angaben können wir nicht liefern (Bereitstellung vertraglich erforderlich).
      </p>
      <p>
        <strong>Automatische Textprüfung:</strong> Wunschtexte werden vor der Bestellung
        automatisch mit Wortlisten auf unzulässige Inhalte (z. B. Beleidigungen, Hass) und
        geschützte Marken abgeglichen. Das geschieht in deinem Browser und beim Absenden
        nochmals auf unserem Server. Beanstandete Texte können nicht bestellt werden; du kannst
        sie ändern oder eine individuelle Anfrage stellen. Beanstandete Eingaben werden von uns
        nicht gespeichert. Es handelt sich um eine bloße
        Eingabeprüfung ohne Profilbildung; eine ausschließlich automatisierte Entscheidung mit
        rechtlicher Wirkung im Sinne von Art. 22 DSGVO findet nicht statt, den Vertrag und
        eine etwaige Ablehnung nach den AGB entscheiden wir selbst.
        <strong> Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragsabwicklung) und lit. f
        DSGVO (berechtigtes Interesse, keine Rechtsverletzungen zu produzieren).
      </p>
      <p>
        <strong>Prüfung und Freigabe des Wunschtextes:</strong> Bestellst du einen geänderten
        Wunschtext, prüfe ich ihn nach der Zahlung selbst (innerhalb von 24 Stunden) und gebe ihn
        frei oder lehne ihn ab. Entscheide ich nicht innerhalb dieser 24 Stunden, wird die Bestellung
        automatisch abgelehnt und der gezahlte Betrag einschließlich Versand erstattet; eine
        Annahme nach Fristablauf findet nicht statt. Dafür sehe ich den Wunschtext zusammen mit der Bestellnummer, und
        ich speichere die Entscheidung (Freigabe oder Ablehnung mit Grund, Zeitpunkt) bei der
        Bestellung. Bei Ablehnung erstatte ich den gezahlten Betrag einschließlich Versand über
        PayPal (siehe 12.3). Die Entscheidung trifft ein Mensch, keine automatisierte Entscheidung
        im Sinne von Art. 22 DSGVO.{" "}
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragsabwicklung) und lit. f
        DSGVO (berechtigtes Interesse, keine rechtswidrigen oder rechteverletzenden Inhalte
        herzustellen). Die Speicherdauer richtet sich nach den Bestelldaten (siehe 12.9).
      </p>

      <h3>12.2 Individuelle Anfragen und Bild-Uploads</h3>
      <p>
        Über das Formular &bdquo;Individueller Druck&ldquo; übermittelst du Beschreibung, Maße,
        Wunschfarbe, Name, E-Mail und optional bis zu 3 Bilder. Zweck: Angebot erstellen.{" "}
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche
        Maßnahmen). Die Bilder liegen in einem <strong>nicht öffentlichen Speicherbereich</strong>{" "}
        (Supabase Storage); nur wir haben Zugriff. Lade bitte nur Bilder hoch, an denen du die
        Rechte hast und auf denen keine fremden Personen erkennbar sind, soweit diese nicht
        eingewilligt haben. Bilder können Metadaten (z. B. Aufnahmeort) enthalten. Beim Hochladen
        werden Bilder in deinem Browser verkleinert und neu als JPEG gespeichert; dabei entfallen
        übliche Metadaten wie der Aufnahmeort. Nach Ablehnung oder Abschluss der Anfrage löschen
        wir Bilder nach <strong>30 Tagen</strong>.
      </p>

      <h3>12.3 Zahlung (PayPal)</h3>
      <p>
        Du zahlst sofort bei der Bestellung: Nach dem Klick auf &bdquo;Zahlungspflichtig
        bestellen&ldquo; leiten wir dich zu PayPal weiter (PayPal (Europe) S.à r.l. et Cie, S.C.A.,
        22-24 Boulevard Royal, L-2449 Luxemburg). Dabei werden Bestellnummer und Betrag an PayPal
        übergeben; deine Zahlungsdaten gibst du nur bei PayPal ein. Nach bestätigter Zahlung
        senden wir dir die Bestellbestätigung, bei geändertem Wunschtext zunächst eine
        Eingangsbestätigung und die Bestellbestätigung erst nach meiner Textfreigabe. Lehne ich
        eine bezahlte Bestellung ab, veranlasse ich die vollständige Erstattung (einschließlich
        Versand) über PayPal; dafür übergebe ich PayPal die Transaktions-ID und den Betrag. Bei Angeboten (individuelle Anfragen) zahlst du
        ebenfalls per PayPal. PayPal ist für die Zahlungsabwicklung{" "}
        <strong>eigenständig verantwortlich</strong>; dort gelten die{" "}
        <a href="https://www.paypal.com/de/legalhub/paypal/privacy-full" target="_blank" rel="noopener noreferrer">
          Datenschutzbestimmungen von PayPal
        </a>
        . Wir erhalten von PayPal die Zahlungsbestätigung (Betrag, Transaktions-ID, Name, ggf.
        E-Mail). <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO. Zahlungsdaten
        (Karte/Konto) erhalten wir nicht.
      </p>

      <h3>12.4 Benachrichtigung über neue Bestellungen (E-Mail und Telegram)</h3>
      <p>
        Bei einer Bestellung oder Anfrage erhalten wir eine E-Mail und eine Telegram-Nachricht.
        <strong> Der Wunschtext wird nicht über Telegram übertragen;</strong> Telegram erhält nur
        die Bestellnummer (und die Art, z. B. Bestellung/Anfrage), bei Bestellungen mit
        geändertem Wunschtext zusätzlich die Anzahl der Wunschtexte und einen{" "}
        <strong>geheimen Link</strong> zu einer nicht öffentlichen Seite dieses Shops, auf der
        ich den Text sehe und freigebe oder ablehne. Zugriff auf diese Seite besteht nur über den
        geheimen Link. Namen, Anschriften, Texte und Bilder enthält die Nachricht nicht. Anbieter: Telegram FZ-LLC (Dubai,
        Vereinigte Arabische Emirate), ein Drittland ohne Angemessenheitsbeschluss.{" "}
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (zeitnahe Bearbeitung). Die
        übermittelte Bestellnummer ist pseudonym. Die
        Benachrichtigung bei Grußvideo-Anfragen (Abschnitt 8) funktioniert anders und bleibt davon
        unberührt.
      </p>

      <h3>12.5 E-Mail-Versand</h3>
      <p>
        Bestellbestätigung, Eingangsbestätigung (bei Bestellungen mit geändertem Wunschtext und bei
        Anfragen), Absage mit Begründung bei abgelehntem Wunschtext, Versandnachricht und Angebote
        versenden wir per E-Mail über den SMTP-Server von <strong>IONOS SE</strong> (Elgendorfer
        Str. 57, 56410 Montabaur), wie beim Kontaktformular (Abschnitt 9).{" "}
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO. Mit Dienstleistern werden,
        soweit erforderlich, Auftragsverarbeitungsverträge nach Art. 28 DSGVO geschlossen.
      </p>

      <h3>12.6 Versand</h3>
      <p>
        Für die Zustellung geben wir Name und Anschrift (bei Bedarf E-Mail für Sendungsverfolgung)
        an <strong>DHL (Deutsche Post AG, Charles-de-Gaulle-Straße 20, 53113 Bonn)</strong>{" "}
        weiter. <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h3>12.7 Hosting und Datenbank</h3>
      <p>
        Die Seite läuft bei Vercel Inc. (USA), Funktionsregion Frankfurt; die Datenbank bei
        Supabase (Rechenzentrum EU, Irland; Anbieter Supabase Inc., USA). Vercel verarbeitet
        technisch erforderliche Zugriffsdaten (IP-Adresse, Zeitpunkt, Browser),{" "}
        <strong>Rechtsgrundlage</strong> Art. 6 Abs. 1 lit. f DSGVO. Mit Dienstleistern
        werden, soweit erforderlich, Auftragsverarbeitungsverträge geschlossen. Für die Übermittlung in die USA gelten der{" "}
        <strong>EU-US Data Privacy Framework</strong>-Angemessenheitsbeschluss, soweit der
        Anbieter zertifiziert ist, und ergänzend Standardvertragsklauseln (Art. 45, 46 DSGVO).
      </p>

      <h3>12.8 Keine Cookies, kein Tracking</h3>
      <p>
        Im Shop setzen wir keine Tracking- oder Marketing-Cookies ein und binden keine externen
        Schriften oder Skripte ein (Schriften lokal). Zur Bestellung speichert dein Browser
        vorübergehend den Zwischenstand deines Warenkorbs (<code>sessionStorage</code>); das ist
        technisch erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG) und endet mit dem Schließen des Tabs.
        Eine Klick-Statistik ist im Shop nicht aktiv.
      </p>

      <h3>12.9 Speicherdauer im Shop</h3>
      <ul>
        <li>
          Name, Anschrift, E-Mail, Wunschtext, Hinweise: bis <strong>90 Tage nach Lieferung</strong>,
          danach anonymisiert oder gelöscht (Zeit für Widerruf und Reklamation).
        </li>
        <li>
          Abgelehnte (auch automatisch abgelehnte) und stornierte Bestellungen: <strong>30 Tage</strong>
          nach Ablehnung bzw. Stornierung, danach anonymisiert; die Erstattung bleibt als
          Buchungsbeleg ohne Namen erhalten (siehe unten).
        </li>
        <li>Bilder zu Anfragen: <strong>30 Tage</strong> nach Ende der Anfrage.</li>
        <li>Anfragen ohne Vertrag: <strong>30 Tage</strong> nach Beendigung der Anfrage.</li>
        <li>
          Buchungsbelege (Betrag, Datum, Artikel, Transaktions-ID, ohne Namen): 8 Jahre (§ 147 AO,
          Art. 6 Abs. 1 lit. c DSGVO).
        </li>
        <li>
          Geschäftliche E-Mails (Angebote, Bestätigungen): soweit steuerlich relevant bis zu 6
          Jahre (§ 147 AO).
        </li>
        <li>
          Widerrufserklärungen (Widerrufsfunktion/Formular): wie die zugehörige Bestellung (Art. 6
          Abs. 1 lit. b/c DSGVO).
        </li>
      </ul>
      <p>
        Nach der Löschung können wir Reklamationen nur anhand deiner Bestellbestätigung
        nachvollziehen. Bitte bewahre sie auf.
      </p>

      <h3>12.10 Deine Rechte im Shop</h3>
      <p>
        Du hast Rechte auf Auskunft (Art. 15), Berichtigung (16), Löschung (17), Einschränkung
        (18), Datenübertragbarkeit (20) und Widerspruch (21 DSGVO) sowie auf Widerruf erteilter
        Einwilligungen (Art. 7 Abs. 3). <strong>Widerspruchsrecht:</strong> Soweit wir Daten auf
        Art. 6 Abs. 1 lit. f stützen, kannst du jederzeit aus Gründen, die sich aus deiner
        besonderen Situation ergeben, widersprechen. Beschwerde: Bayerisches Landesamt für
        Datenschutzaufsicht, Promenade 18, 91522 Ansbach (Art. 77 DSGVO). Es gibt keine
        automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO und kein Profiling.
      </p>

      <LegalFooter />
    </div>
  );
}
