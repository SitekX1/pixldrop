// Screenshots der Mail-Vorschau (390 und 700 px) per Playwright. Voraussetzung: Bilder erreichbar unter VORSCHAU_SITE
// (z. B. `python -m http.server 3999 --directory public`). Playwright wird aus melina-web geladen (kein Projekt-Paket).
const { chromium } = require("D:/Apps/melina-web/node_modules/playwright");
const OUT = "D:/Apps/.playwright-mcp";
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_EXE || "C:/Users/Alex/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
  for (const name of ["standard", "gemischt", "individuell", "absage", "widerruf"]) {
    for (const [w, scheme] of [[390, "light"], [700, "light"], [390, "dark"]]) {
      if (scheme === "dark" && name !== "gemischt") continue;
      const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      await p.goto("file:///" + OUT + `/mail-vorschau-${name}.html`);
      await p.waitForLoadState("networkidle");
      await p.screenshot({ path: `${OUT}/mail-vorschau-${name}-${w}${scheme === "dark" ? "-dark" : ""}.png`, fullPage: true });
      await ctx.close();
    }
  }
  await b.close();
})();
