import Link from "next/link";
import LegalFooter from "@/components/LegalFooter";

export const metadata = { title: "AGB — PixlDrop" };

export default function AGB() {
  return (
    <div className="legal-page">
      <Link href="/" className="back">
        ← Zurück
      </Link>
      <h1>Allgemeine Geschäftsbedingungen</h1>

      <h2>1. Geltungsbereich und Anbieter</h2>
      <p>
        Diese Bedingungen gelten für alle Verträge über personalisierte Grußvideos, die über
        pixldrop.de zwischen dir als Kundin/Kunde und Alexander Sitek,
        Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim (nachfolgend „wir&quot;), geschlossen
        werden. Unsere Angebote richten sich an Verbraucherinnen und Verbraucher.
      </p>

      <h2>2. Leistungsbeschreibung</h2>
      <p>
        Wir erstellen ein kurzes, individuell besprochenes Animationsvideo (Länge ca. 8
        Sekunden) mit unserer fiktiven Zeichentrickfigur „Eddie&quot;. Die Videos werden unter
        Zuhilfenahme KI-gestützter Design-Tools produziert. Die Lieferung erfolgt als digitale
        Videodatei (MP4) per E-Mail; ein körperlicher Datenträger wird nicht versandt.
      </p>
      <p>
        Für die Erstellung wird kein Foto und keine Sprachaufnahme von dir oder Dritten
        benötigt oder verwendet. Es wird ausschließlich unsere eigene Figur animiert.
      </p>

      <h2>3. Zustandekommen des Vertrags</h2>
      <p>
        Die Darstellung auf unserer Website ist noch kein bindendes Angebot. Der Ablauf ist:
      </p>
      <p>
        (1) Du sendest über das Formular eine <strong>unverbindliche und kostenlose
        Anfrage</strong> mit deinen Wünschen. (2) Wir prüfen den Aufwand und senden dir per
        E-Mail ein individuelles Preisangebot. (3) Der Vertrag kommt erst zustande, wenn du
        dieses Angebot ausdrücklich annimmst. (4) Nach Zahlungseingang produzieren und liefern
        wir das Video.
      </p>

      <h2>4. Preise und Zahlung</h2>
      <p>
        Die Preise richten sich nach dem individuellen Aufwand und werden dir vor Vertragsschluss
        als Gesamtpreis genannt. Aufgrund der Kleinunternehmerregelung nach § 19 UStG erheben
        wir keine Umsatzsteuer und weisen diese daher nicht aus. Die Zahlung erfolgt vorab über
        das im Angebot genannte Zahlungsmittel.
      </p>

      <h2>5. Lieferzeit</h2>
      <p>
        Wir liefern in der Regel innerhalb von 24 bis 48 Stunden nach Zahlungseingang. Sollte es
        im Einzelfall länger dauern, informieren wir dich.
      </p>

      <h2>6. Nutzungsrechte</h2>
      <p>
        Du erhältst ein einfaches, zeitlich und räumlich unbeschränktes Recht, das gelieferte
        Video für <strong>private Zwecke</strong> zu nutzen und mit anderen zu teilen (z. B. per
        Messenger oder in sozialen Netzwerken). Nicht gestattet sind der Weiterverkauf, die
        Nutzung für eigene gewerbliche oder werbliche Zwecke sowie das Anbieten des Videos auf
        anderen Plattformen als eigenes Produkt. Alle weitergehenden Rechte an der Figur und der
        Animation verbleiben bei uns.
      </p>

      <h2>7. Inhaltliche Grenzen</h2>
      <p>
        Wir behalten uns vor, Anfragen abzulehnen, deren gewünschter Inhalt rechtswidrig,
        beleidigend, diskriminierend, jugendgefährdend oder persönlichkeitsrechtsverletzend ist
        oder gegen Rechte Dritter verstößt. Da noch kein Vertrag geschlossen wurde, entstehen dir
        dadurch keine Kosten.
      </p>

      <h2>8. Widerrufsrecht</h2>
      <p>
        Als Verbraucherin oder Verbraucher steht dir ein gesetzliches Widerrufsrecht zu. Die
        Einzelheiten und die Voraussetzungen für ein vorzeitiges Erlöschen findest du in unserer{" "}
        <Link href="/widerrufsrecht">Widerrufsbelehrung</Link>.
      </p>

      <h2>9. Mängel</h2>
      <p>
        Für die Bereitstellung digitaler Inhalte gelten die gesetzlichen Bestimmungen
        (§§ 327 ff. BGB). Weicht das gelieferte Video von dem ab, was vereinbart wurde, melde
        dich bitte bei uns — wir bessern in diesem Fall nach.
      </p>

      <h2>10. Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht. Sollte eine Bestimmung dieser Bedingungen unwirksam sein, bleibt
        die Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>

      <p className="legal-updated">Stand: September 2026</p>

      <LegalFooter />
    </div>
  );
}
