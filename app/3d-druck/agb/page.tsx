import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";
import { Abschnitt } from "@/components/shop/RechtText";

export const metadata = { title: "AGB (Entwurf)" };

// ENTWURF von Dr. Justus (recht-texte/agb-shop.md, Variante B, Stand 2026-10-08). Nicht veröffentlichen,
// bevor die [PLATZHALTER] ersetzt sind und Magnus gegengelesen hat. Anmerkungsblöcke bewusst nicht übernommen.
const S: { titel: string; a: string[] }[] = [
  { titel: "1. Geltungsbereich und Anbieter", a: [
    "(1) Diese Bedingungen gelten für alle Verträge über den Kauf und die Anfertigung von 3D-gedruckten Gegenständen, die du über den Shop unter pixldrop.de/3d-druck oder über eine individuelle Anfrage mit **Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim, E-Mail: as@sitekx.de** (nachfolgend „ich“) schließt.",
    "(2) Der Shop richtet sich an Verbraucherinnen und Verbraucher (§ 13 BGB). Bestellungen zu gewerblichen oder selbstständigen beruflichen Zwecken bitte als individuelle Anfrage stellen; hierfür gilt ein gesondertes Angebot. [PLATZHALTER: Alex bestätigt „nur Verbraucher“ oder wünscht Unternehmerklausel]",
    "(3) Lieferungen erfolgen **nur innerhalb Deutschlands**.",
    "(4) Abweichende Bedingungen von dir gelten nicht, auch wenn ich ihnen nicht ausdrücklich widerspreche.",
  ] },
  { titel: "2. Produkte und Beschaffenheit", a: [
    "(1) Ich biete Dekorations- und Gebrauchsgegenstände aus Kunststoff (PLA bzw. PETG, je nach Artikelseite) an, die im Schmelzschichtverfahren (FDM) gedruckt werden. Die genauen Eigenschaften (Material, Maße, Farbe, Verwendung) stehen auf der jeweiligen Artikelseite; sie sind die vereinbarte Beschaffenheit.",
    "(2) Maßangaben auf der Artikelseite enthalten die dort genannte Toleranz; die Toleranz ist Teil der Maßangabe. Besonderheiten des Druckverfahrens (z. B. die sichtbare Schichtstruktur) und die Farbe beschreibe ich ebenfalls auf der Artikelseite. Bildschirme stellen Farben unterschiedlich dar.",
    "(3) Artikelfotos mit der Kennzeichnung „Render“ oder „Muster“ sind Illustrationen. Die Kennzeichnung „Foto“ zeigt ein tatsächlich gefertigtes Stück.",
    "(4) Die Artikel sind **kein Spielzeug**, **nicht für Kinder unter 3 Jahren** und **nicht für Lebensmittelkontakt** bestimmt. Teelichthalter und Laternen sind nur für **LED-Teelichter** vorgesehen, **nicht für offene Flamme**. Weitere Hinweise stehen auf der Artikelseite und im Beipackzettel; bitte beachte sie.",
  ] },
  { titel: "3. Vertragsschluss im Shop (Standardartikel, Zahlung sofort per PayPal)", a: [
    "(1) Die Darstellung der Artikel im Shop ist noch kein verbindliches Angebot, sondern eine Aufforderung an dich, ein Angebot abzugeben.",
    "(2) **So läuft die Bestellung ab:** Du wählst Artikel, Farbe und Menge, gibst Lieferdaten ein und kommst zur Übersichtsseite („Prüfen & bestellen“). Dort siehst du alle Angaben noch einmal. Mit dem Klick auf **„Zahlungspflichtig bestellen“** gibst du ein verbindliches Kaufangebot ab und wirst direkt zu **PayPal** weitergeleitet, um die Zahlung abzuschließen.",
    "(3) **Eingaben prüfen und korrigieren:** Vor dem Absenden kannst du alle Angaben über „Zurück“ bzw. „Daten ändern“ prüfen und ändern; den Warenkorbinhalt kannst du im ersten Schritt ändern oder entfernen.",
    "(4) **Der Vertrag kommt zustande, wenn ich dein Angebot mit der Bestellbestätigung per E-Mail annehme.** Ich sende sie nach erfolgreicher Zahlung über PayPal an die von dir angegebene E-Mail-Adresse. Schließt du die Zahlung bei PayPal nicht ab, kommt kein Vertrag zustande. Die Anzeige einer Bestellnummer im Shop und eine automatische Mail, die nur den Eingang bestätigt, sind noch keine Annahme. Bei Bestellungen mit geändertem Wunschtext steht die Annahme unter dem Rücktrittsvorbehalt nach Ziffer 9 Abs. 3 (Textprüfung nach Zahlung).",
    "(5) Ich nehme dein Angebot innerhalb von **[PLATZHALTER 2] Werktagen** nach erfolgter Zahlung an oder lehne es ab. Nach Ablauf dieser Frist bist du nicht mehr an dein Angebot gebunden; eine bereits erfolgte Zahlung erstatte ich.",
    "(6) Ich kann eine Bestellung ablehnen, z. B. wenn die gewählte Farbe nicht mehr vorrätig ist. Dann ist kein Vertrag zustande gekommen; **bereits geleistete Zahlungen erstatte ich unverzüglich** über PayPal.",
    "(7) **Vertragssprache** ist Deutsch. **Speicherung des Vertragstextes:** Deine Bestelldaten und diese AGB erhältst du mit der Bestellbestätigung per E-Mail (AGB als Anhang). Ich speichere die Bestelldaten nur für die in der Datenschutzerklärung genannten Fristen; später ist der Vertragstext für dich nur über deine E-Mails abrufbar. Bitte bewahre sie auf. Die AGB kannst du jederzeit unter pixldrop.de/3d-druck/agb abrufen und speichern.",
  ] },
  { titel: "4. Preise und Versandkosten", a: [
    "(1) Alle Preise sind Endpreise in Euro. Aufgrund der Kleinunternehmerregelung nach § 19 UStG wird **keine Umsatzsteuer erhoben und nicht ausgewiesen**.",
    "(2) Zusätzlich zum Warenpreis fallen Versandkosten von **[PLATZHALTER Betrag]** je Bestellung an (nur Deutschland); sie werden vor Abgabe der Bestellung auf der Übersichtsseite angezeigt.",
    "(3) Tischschild und Spruch-Untersetzer bestellst du im Shop mit änderbarem Wunschtext zum Preis der Artikelseite. Für alles Weitere (z. B. Logo, Bild, andere Schrift, Sonderfarben oder -maße, Anfertigung nach Vorlage) gibt es keinen Festpreis im Shop: **Preis nach Anfrage**, siehe Ziffer 10. Es entstehen keine weiteren Zusatzentgelte für die Zahlung.",
  ] },
  { titel: "5. Zahlung", a: [
    "(1) Die Zahlung erfolgt **sofort bei Bestellung per PayPal** (Vorkasse). Nach „Zahlungspflichtig bestellen“ wirst du zu PayPal weitergeleitet. PayPal bietet dort je nach Verfügbarkeit weitere Zahlungsoptionen an (z. B. Lastschrift, Karte); es gelten die Bedingungen von PayPal.",
    "(2) Ich beginne mit dem Druck nach bestätigter Zahlung und Bestellbestätigung, bei geändertem Wunschtext zusätzlich nach meiner Textprüfung (Ziffer 9 Abs. 3).",
    "(3) Rückerstattungen (z. B. nach Widerruf oder Ablehnung der Bestellung) erfolgen über dasselbe Zahlungsmittel.",
    "(4) Für Verträge nach Ziffer 10 (Angebot) gilt: Der Kaufpreis bzw. die Anzahlung ist **innerhalb von [PLATZHALTER 7] Tagen** nach Vertragsschluss per PayPal zu zahlen (Zahlungslink im Angebot bzw. in der Annahmebestätigung). Zahlst du nicht rechtzeitig, kann ich dir eine angemessene Nachfrist setzen und danach vom Vertrag zurücktreten.",
  ] },
  { titel: "6. Lieferung und Lieferzeit", a: [
    "(1) Ich liefere an die von dir angegebene Lieferadresse in Deutschland; Versandart und Dienstleister: siehe „Versand & Zahlung“.",
    "(2) Die Lieferzeit beträgt **[PLATZHALTER z. B. 3 bis 5 Werktage Fertigung plus 1 bis 3 Werktage Versand] ab Vertragsschluss (Bestellbestätigung)**. Bei Anfertigungen nach Ziffer 10 steht die Frist im Angebot.",
    "(3) Ist eine gewählte Farbe zwischenzeitlich nicht mehr vorrätig, informiere ich dich unverzüglich, biete dir eine Alternative an oder erstatte dir den Kaufpreis.",
    "(4) Ich liefere vollständige Bestellungen in einer Sendung. Teillieferungen erfolgen nur, wenn sie für dich zumutbar sind und keine zusätzlichen Versandkosten entstehen.",
    "(5) Die Gefahr (Verlust, Beschädigung auf dem Transportweg) geht bei Versand an dich als Verbraucher erst mit der **Übergabe der Ware an dich** über (§ 475 Abs. 2 BGB).",
  ] },
  { titel: "7. Eigentumsvorbehalt", a: [
    "Die Ware bleibt bis zur vollständigen Bezahlung mein Eigentum. Da du bei Bestellung sofort zahlst und ich erst danach liefere, hat dies nur Bedeutung, falls ich ausnahmsweise vorab liefere (z. B. bei Anzahlung nach Ziffer 10).",
  ] },
  { titel: "8. Widerrufsrecht", a: [
    "(1) Als Verbraucherin oder Verbraucher hast du bei Standardartikeln aus dem Shop ein gesetzliches Widerrufsrecht. Einzelheiten, das Muster-Widerrufsformular und die Rücksendekosten stehen in der **Widerrufsbelehrung** (pixldrop.de/3d-druck/widerruf), die Teil der Bestellbestätigung per E-Mail ist.",
    "(2) **Kein Widerrufsrecht** besteht nach § 312g Abs. 2 Nr. 1 BGB nur bei **individuell angefertigten Waren**, also Waren, die nicht vorgefertigt sind und für deren Herstellung deine individuelle Auswahl oder Bestimmung maßgeblich ist oder die eindeutig auf deine persönlichen Bedürfnisse zugeschnitten sind. Das betrifft (a) Tischschild und Spruch-Untersetzer, bei denen du im Shop den voreingestellten Text **änderst**, und (b) Anfertigungen nach Anfrage gemäß Ziffer 10 (z. B. Logo, Bild, andere Schrift, Maßangabe, Zeichnung oder Vorlage). Auf den Ausschluss weise ich dich bei (a) im Bestellvorgang **vor** dem Absenden und bei (b) im Angebot **vor** deiner Annahme ausdrücklich hin; bei (a) bestätigst du die Kenntnisnahme per Auswahlfeld. Tischschild und Spruch-Untersetzer mit **unverändertem** Standardtext sowie Artikel, bei denen du im Shop nur eine Farbe oder Variante aus meinem Sortiment wählst, sind keine individuell angefertigten Waren; dafür besteht das Widerrufsrecht, auch wenn du sie zusammen mit einem Stück nach (a) bestellst.",
  ] },
  { titel: "9. Wunschtexte, Bilder und Vorlagen des Kunden (geänderter Wunschtext im Shop, Anfragen nach Ziffer 10)", a: [
    "(1) Du versicherst, dass du die Rechte an allen von dir übermittelten Texten, Namen, Bildern und Vorlagen besitzt oder zur Verwendung berechtigt bist und dass durch deren Verwendung **keine Rechte Dritter** (Urheber-, Marken-, Namens-, Persönlichkeitsrechte, Recht am eigenen Bild) verletzt werden.",
    "(2) Du räumst mir das einfache Recht ein, deine Texte, Bilder und Vorlagen **ausschließlich zur Herstellung und Lieferung** deiner Bestellung zu nutzen. Eine Veröffentlichung oder Werbung (z. B. in Videos oder Beiträgen) mit deinem Stück oder deinen Inhalten erfolgt nur mit deiner gesonderten, ausdrücklichen Einwilligung.",
    "(3) Ich darf Texte, Bilder und Vorlagen **ablehnen**, die rechtswidrig sind, Rechte Dritter verletzen (z. B. geschützte Marken, Logos, Figuren), beleidigend, diskriminierend, jugendgefährdend oder gewaltverherrlichend sind oder verfassungsfeindliche Kennzeichen enthalten. Eine Prüfpflicht habe ich nicht. Bei Bestellungen im Shop mit geändertem Wunschtext prüfe ich den Text nach Eingang deiner Zahlung vor Beginn des Drucks. Liegt einer der genannten Gründe vor, bin ich berechtigt, vom Vertrag zurückzutreten; das teile ich dir unverzüglich per E-Mail mit. In diesem Fall **erstatte ich dir den gezahlten Betrag einschließlich der Versandkosten vollständig und unverzüglich** über PayPal. Das Gleiche gilt, wenn ich solche Inhalte bei einer Anfrage nach Ziffer 10 erst nach Vertragsschluss feststelle. Vor Vertragsschluss entstehen dir durch eine Ablehnung keine Kosten.",
    "(4) Du stellst mich von berechtigten Ansprüchen Dritter frei, die diese wegen einer von dir zu vertretenden Verletzung ihrer Rechte durch deine Inhalte gegen mich geltend machen, einschließlich angemessener Rechtsverteidigungskosten.",
    "(5) Wunschtexte gebe ich so wieder, wie du sie eingibst bzw. im Angebot bestätigst. Bitte prüfe Rechtschreibung und Schreibweise vor dem Absenden der Bestellung bzw. im Angebot; ein von dir so bestellter Tippfehler ist kein Mangel. Zulässig sind die angebotenen Zeichen und Schriften.",
  ] },
  { titel: "10. Individuelle Anfragen und Angebote (Preis nach Anfrage)", a: [
    "(1) Individuelles, das über den im Shop änderbaren Wunschtext bei Tischschild und Spruch-Untersetzer hinausgeht (z. B. Logo, Bild, andere Schrift, Sonderfarben/-maße, Anfertigung nach Vorlage), bestellst du **nicht** im Warenkorb, sondern über das Formular „Individueller Druck“. Die Anfrage ist **unverbindlich und kostenlos**, kein Vertragsangebot und enthält keinen Preis. **Preis nach Anfrage.**",
    "(2) Mein Angebot sende ich dir per E-Mail. Es enthält Beschreibung, Material, Maße, Gesamtpreis (inkl. Versand), Lieferzeit, ggf. Anzahlung und den Hinweis zum Widerruf (Ziffer 8 Abs. 2). Ich halte mich **[PLATZHALTER 14] Tage** daran gebunden.",
    "(3) Der Vertrag kommt zustande, wenn du das Angebot innerhalb dieser Frist annimmst, entweder durch Antwort per E-Mail mit eindeutiger Annahmeerklärung oder über den im Angebot genannten Annahme-Link (Schaltfläche „Angebot zahlungspflichtig annehmen“). Die Zahlung erfolgt danach per PayPal nach Ziffer 5 Abs. 4.",
    "(4) Individuelle Anfertigungen werden nach deinen Vorgaben hergestellt; ein Widerrufsrecht besteht nach Ziffer 8 Abs. 2 nicht. Darauf weise ich im Angebot vor der Annahme hin.",
    "(5) **Anzahlung:** Bei individuellen Anfertigungen kann ich eine Anzahlung von bis zu **[PLATZHALTER z. B. 30 %]** des Preises verlangen; sie wird auf den Kaufpreis angerechnet. Ich beginne mit Konstruktion und Druck nach Zahlungseingang.",
    "(6) **Abbruch durch dich:** Vor Beginn von Konstruktion und Druck kannst du den Vertrag ohne Kosten beenden. Danach kannst du ihn nur beenden, wenn du mir die bereits erbrachten Leistungen (Konstruktion, Druckzeit, verbrauchtes Material) vergütest. [PLATZHALTER: Pauschale entfällt / der Nachweis bleibt dir offen]. Gesetzliche Rechte bleiben unberührt.",
    "(7) Rechte an Entwürfen, die ich für dich erstelle (Modelle, Druckdateien), bleiben bei mir; du erhältst das Eigentum an dem gelieferten Stück. Eine Herausgabe von Druckdateien ist nur vereinbart, wenn das Angebot sie ausdrücklich nennt.",
  ] },
  { titel: "11. Mängelrechte (Gewährleistung)", a: [
    "(1) Es gelten die gesetzlichen Mängelrechte (§§ 434 ff. BGB). Bei neuen Waren verjähren sie nach **zwei Jahren** ab Ablieferung. In den ersten zwölf Monaten wird zu deinen Gunsten vermutet, dass ein Mangel schon bei Übergabe vorlag (§ 477 BGB).",
    "(2) Bitte melde Mängel möglichst bald per E-Mail an as@sitekx.de, am besten mit Foto und Bestellnummer. Eine Meldefrist besteht nicht.",
    "(3) Du hast zunächst Anspruch auf Nacherfüllung (Reparatur oder Ersatzlieferung). Bist du Verbraucher, trage ich die Kosten der Nacherfüllung einschließlich der Rücksendung.",
    "(4) Natürlicher Verschleiß, unsachgemäße Nutzung oder Nutzung entgegen den Hinweisen auf der Artikelseite (z. B. Hitze über [PLATZHALTER °C], offene Flamme, Spülmaschine) sind keine Mängel, soweit die Hinweise vor dem Kauf angezeigt wurden.",
    "(5) Eine über das Gesetz hinausgehende Garantie gebe ich nicht.",
  ] },
  { titel: "12. Haftung", a: [
    "(1) Ich hafte unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper und Gesundheit, bei arglistig verschwiegenen Mängeln, bei übernommenen Garantien und nach dem Produkthaftungsgesetz.",
    "(2) Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht (Pflicht, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags erst ermöglicht und auf deren Einhaltung du regelmäßig vertrauen darfst) ist meine Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt.",
    "(3) Im Übrigen ist die Haftung bei leichter Fahrlässigkeit ausgeschlossen.",
    "(4) Die Haftung nach Ziffer 11 (Mängelrechte) bleibt unberührt.",
  ] },
  { titel: "13. Produkthinweise und Rechte an Modellen", a: [
    "(1) Beachte die Sicherheits- und Pflegehinweise auf Artikelseite und Beipackzettel, insbesondere: nur LED-Teelichter, keine offene Flamme, kein Spielzeug, nicht für Lebensmittelkontakt, Hitzegrenze beachten.",
    "(2) Mein Entwurf und die Druckdateien bleiben mein geistiges Eigentum; das Nachdrucken oder die gewerbliche Vervielfältigung des gelieferten Stücks ist nicht erlaubt. Soweit Modelle Dritter unter Creative-Commons-Lizenz verwendet werden, nenne ich Urheber und Lizenz auf der Artikelseite.",
  ] },
  { titel: "14. Datenschutz", a: ["Informationen zur Verarbeitung deiner Daten findest du in der Datenschutzerklärung (pixldrop.de/datenschutz)."] },
  { titel: "15. Streitbeilegung", a: [
    "Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. [PLATZHALTER: Alex bestätigt, dass dies weiterhin so gewollt ist, wie im bestehenden Impressum.]",
  ] },
  { titel: "16. Schlussbestimmungen", a: [
    "(1) Es gilt deutsches Recht. Bei Verbrauchern aus der EU bleiben zwingende Verbraucherschutzvorschriften des Staates, in dem du deinen gewöhnlichen Aufenthalt hast, unberührt (Art. 6 Rom-I-VO).",
    "(2) Sind einzelne Bestimmungen unwirksam, bleibt der Vertrag im Übrigen wirksam (§ 306 BGB).",
    "Stand: [PLATZHALTER Datum der Veröffentlichung]",
  ] },
];

export default function Agb() {
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Allgemeine Geschäftsbedingungen für den Online-Shop „3D-Druck“</h1>
          <p className="muted">Entwurf, noch nicht rechtsverbindlich. Gelb markierte Stellen sind noch offen.</p>
          {S.map((s) => <Abschnitt key={s.titel} titel={s.titel} absaetze={s.a} />)}
          <p>Impressum und Datenschutzerklärung findest du im Fuß der Seite.</p>
        </article>
      </div>
    </ShopShell>
  );
}
