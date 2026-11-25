// Rendert ALLE Shop-Mails als HTML-Vorschau (Logo als data-URI). Aufruf im Repo-Root:
//   node --import ./tests/shop/register.mjs scripts/mail-vorschau-alle.mts [Zielordner]
// Standard-Ziel: D:/Apps/3D-Druck/Modelle/Shop-Redesign/mail-vorschau
// Beispieldaten/Erzeuger stehen in scripts/mail-beispiele.mts (gemeinsam mit scripts/mail-testversand.mts).
import { mkdirSync, writeFileSync } from "node:fs";
import { einfacheMailHtml, cidZuDataUri } from "../lib/shop/server/mail-layout.ts";
import { baueBeispiele } from "./mail-beispiele.mts";

const OUT = process.argv[2] || "D:/Apps/3D-Druck/Modelle/Shop-Redesign/mail-vorschau";
mkdirSync(OUT, { recursive: true });
const SITE = "https://pixldrop.de";

for (const m of baueBeispiele(SITE)) {
  const html = m.html ?? einfacheMailHtml(m.betreff, m.text, SITE);
  writeFileSync(`${OUT}/${m.datei}.html`, cidZuDataUri(html), "utf8");
}
console.log("fertig:", OUT);
