// Rechtlich relevante Texte des Angebots-Flows (Annahme-Seite /3d-druck/angebot/<token> und Angebots-Mail).
// Geprueft von Dr. Justus am 2026-10-10 (Entwurf mit Restrisiko, siehe D:\Apps\3D-Druck\shop\recht-texte\ANGEBOT-ERGAENZUNGEN.md).
// Aenderung nur in dieser Datei. ANGEBOT_TEXTE_FREIGEGEBEN: auf true gesetzt am 2026-10-10 nach Magnus-Pruefung (Muss-Punkte umgesetzt) und Justus-Konsistenzcheck, im Auftrag von Alex.
// Solange false, zeigt die Annahme-Seite einen sichtbaren Entwurfshinweis.
export const ANGEBOT_TEXTE_FREIGEGEBEN = true;

export const ANGEBOT_TEXTE = {
  /** Pflicht-Checkbox 1: AGB + Widerrufsbelehrung (Links werden von der Seite gesetzt). */
  agbLabel: "Ich habe die AGB und die Widerrufsbelehrung zur Kenntnis genommen und akzeptiere die AGB.",
  /** Pflicht-Checkbox 2: Widerrufsausschluss bei Sonderanfertigung (§ 312g Abs. 2 Nr. 1 BGB). */
  verzichtLabel:
    "Ich bestätige, dass ich weiß: Für dieses nach meinen Vorgaben individuell angefertigte Stück besteht kein gesetzliches Widerrufsrecht (§ 312g Abs. 2 Nr. 1 BGB). Ich kann den Vertrag nach der Annahme nicht widerrufen.",
  /** Kurzer Hinweis oberhalb der Checkboxen. */
  verzichtHinweis:
    "Dieses Stück wird nach deinen Angaben einzeln für dich gefertigt. Für solche Waren gibt es kein gesetzliches Widerrufsrecht. Mit „Angebot zahlungspflichtig annehmen“ nimmst du mein Angebot an; der Gesamtpreis ist dann bei PayPal zu zahlen, die Zahlungspflicht entsteht mit Annahme und erfolgreicher Zahlung. Deine gesetzlichen Mängelrechte bleiben unberührt.",
  /** Beschriftung des Annahme-Buttons (§ 312j Abs. 3 BGB; deckt sich mit AGB Ziffer 10 Abs. 3). */
  buttonLabel: "Angebot zahlungspflichtig annehmen",
  /** Hinweis in der Angebots-Mail (neutral, der verbindliche Wortlaut steht auf der Annahme-Seite). */
  mailHinweis:
    "Wichtig: Dieses Stück wird nach deinen Angaben individuell für dich angefertigt. Dafür besteht kein gesetzliches Widerrufsrecht (§ 312g Abs. 2 Nr. 1 BGB); das bestätigst du vor der Annahme auf der Annahme-Seite. Dort siehst du auch noch einmal alle Angaben und den Gesamtpreis. Die Preise enthalten keine Umsatzsteuer (Kleinunternehmer nach § 19 UStG). Bezahlt wird per PayPal. Nach dem Ablauf der Gültigkeit erlischt das Angebot und kann nicht mehr angenommen werden. Deine gesetzlichen Mängelrechte bleiben unberührt.",
  /** Hinweis unter dem Button. */
  zahlungHinweis:
    "Mit dem Klick nimmst du mein Angebot an und wirst zu PayPal weitergeleitet. Der Vertrag kommt mit deiner erfolgreichen Zahlung zustande. Gedruckt wird erst danach.",
  /** Absatz der Bestaetigungsmail bei Angebots-Bestellungen (ersetzt den Wunschtext-Freigabe-Satz). */
  bestaetigungAbsatz:
    "Hinweis: Dein Stück wird nach deinen Vorgaben aus meinem Angebot gefertigt. Ein Widerrufsrecht besteht dafür nicht (§ 312g Abs. 2 Nr. 1 BGB); das hast du vor der Annahme bestätigt. Deine gesetzlichen Mängelrechte bleiben unberührt.",
  /** Einleitungssatz der Bestaetigungsmail bei Angebots-Bestellungen (statt "nehme deine Bestellung hiermit an"). */
  bestaetigungEinleitung:
    "Ich habe deine Zahlung erhalten. Damit ist der Vertrag über mein Angebot zustande gekommen; ich bestätige ihn hiermit.",
} as const;
