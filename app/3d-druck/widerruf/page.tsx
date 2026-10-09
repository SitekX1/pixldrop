import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";
import { Abschnitt } from "@/components/shop/RechtText";
import WiderrufForm from "@/components/shop/WiderrufForm";

export const metadata = { title: "Widerrufsbelehrung (Entwurf)" };

// Wortlaut: Muster-Widerrufsbelehrung (Anlage 1) und Muster-Widerrufsformular (Anlage 2) zu Art. 246a EGBGB,
// Kaufvertrag über Waren, Lieferung in einer Sendung (Textbaustein b), Rücksendekosten trägt der Verbraucher,
// keine Abholung angeboten. Widerrufsfunktion § 356a BGB: Abschnitt D (Online-Satz steht nach Gestaltungshinweis 3 hinter dem Absatz "Um Ihr Widerrufsrecht auszuüben").
const UNTERNEHMER = "Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim, E-Mail: as@sitekx.de";
const UNTERNEHMER_ANSCHRIFT = "Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim";

export default function Widerruf() {
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Widerrufsbelehrung</h1>
          
          <Abschnitt titel="A. Widerrufsbelehrung (Standardartikel aus dem Shop)">
            <h3>Widerrufsrecht</h3>
            <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>
            <p>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.</p>
            <p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({UNTERNEHMER}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>
            {/* Stelle laut Gestaltungshinweis 3 zu Anlage 1: am Ende des Absatzes "Um Ihr Widerrufsrecht auszuüben ..." */}
            <p>Sie können Ihr Widerrufsrecht auch online über die Widerrufsfunktion unten auf dieser Seite (Abschnitt D) ausüben. Wenn Sie diese Online-Funktion nutzen, übermitteln wir Ihnen auf einem dauerhaften Datenträger (z. B. durch eine E-Mail) unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.</p>
            <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>
            <h3>Folgen des Widerrufs</h3>
            <p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</p>
            <p>Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.</p>
            <p>Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an {UNTERNEHMER_ANSCHRIFT} zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.</p>
            <p>Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.</p>
            <p>Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.</p>
          </Abschnitt>

          <Abschnitt titel="B. Kein Widerrufsrecht bei individuell angefertigten Waren (geänderter Wunschtext im Shop, Angebote nach AGB Ziffer 10)">
            <p><strong>Kein Widerrufsrecht bei individuell angefertigten Waren.</strong> Das Widerrufsrecht besteht nicht bei Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch dich maßgeblich ist oder die eindeutig auf deine persönlichen Bedürfnisse zugeschnitten sind (§ 312g Abs. 2 Nr. 1 BGB). Das gilt für Stücke, die ich nach deinen Vorgaben anfertige. Bei allen anderen Artikeln im Shop besteht das Widerrufsrecht wie oben beschrieben.</p>
            <p>Das betrifft Tischschild und Spruch-Untersetzer, wenn du den voreingestellten Text änderst, sowie Sonderanfertigungen nach Angebot (z. B. Logo, Bild, andere Schrift). Vor dem Absenden der Bestellung bzw. vor der Annahme des Angebots bestätigst du ausdrücklich, dass dir der Ausschluss bekannt ist. Tischschild und Spruch-Untersetzer mit unverändertem Standardtext sind normale Standardware mit Widerrufsrecht. Enthält eine Bestellung neben einem geänderten Text weitere Standardartikel, besteht das Widerrufsrecht für diese weiter.</p>
          </Abschnitt>

          <Abschnitt titel="C. Muster-Widerrufsformular">
            <div className="shop-form-muster">
              <p>Muster-Widerrufsformular</p>
              <p>(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
              <ul>
                <li>An {UNTERNEHMER}:</li>
                <li>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)</li>
                <li>Bestellt am (*)/erhalten am (*)</li>
                <li>Name des/der Verbraucher(s)</li>
                <li>Anschrift des/der Verbraucher(s)</li>
                <li>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</li>
                <li>Datum</li>
              </ul>
              <p>(*) Unzutreffendes streichen.</p>
            </div>
          </Abschnitt>

          <Abschnitt titel="D. Widerrufsfunktion (§ 356a BGB)">
            <p>Du kannst deinen Vertrag hier online widerrufen. Nach dem Absenden bekommst du eine Eingangsbestätigung per E-Mail mit Inhalt, Datum und Uhrzeit des Eingangs. Alternativ geht der Widerruf weiterhin per E-Mail an as@sitekx.de.</p>
            <div id="widerrufsfunktion" style={{ scrollMarginTop: 16 }}><WiderrufForm /></div>
          </Abschnitt>
        </article>
      </div>
    </ShopShell>
  );
}
