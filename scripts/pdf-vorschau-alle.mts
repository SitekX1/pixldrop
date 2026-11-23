// Rendert die drei Rechts-PDFs der Bestellbestaetigung. Aufruf: node --import ./tests/shop/register.mjs scripts/pdf-vorschau-alle.mts [Ziel]
import { mkdirSync, writeFileSync } from "node:fs";
import { bestaetigungsMail } from "../lib/shop/server/vorlagen.ts";
import { erzeugeAnhaenge } from "../lib/shop/server/pdf.ts";
import { agbKlartext } from "../lib/shop/agb-daten.ts";
const OUT = process.argv[2] || "D:/Apps/3D-Druck/Modelle/Shop-Redesign/mail-vorschau/pdf";
mkdirSync(OUT, { recursive: true });
const b = {
  nummer: "PD-2026-0042", name: "Erika Mustermann", strasse: "Beispielweg 12", plz: "86663", ort: "Asbach-Bäumenheim",
  gesamt_cent: 3380, summe_waren_cent: 2890, versand_cent: 490, individuell: false,
  erstellt_am: "2026-10-09T10:15:00Z", bezahlt_am: "2026-10-09T10:16:30Z", capture_id: "5TY12345AB678901C",
  positionen: [{ name: "Tischschild", menge: 1, einzelpreis_cent: 1490, individuell: false, farbe: "Honiggelb" }, { name: "Spruch-Untersetzer", menge: 2, einzelpreis_cent: 700, individuell: false, farbe: "Schwarz" }],
};
const m = bestaetigungsMail(b as never, undefined, false, { siteUrl: "https://pixldrop.de", lieferzeit: "3 bis 5 Werktage", agbText: agbKlartext("3 bis 5 Werktage") });
for (const a of await erzeugeAnhaenge(m.anhaenge)) writeFileSync(`${OUT}/${a.filename}`, a.content);
console.log("fertig", OUT);
