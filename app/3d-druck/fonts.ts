// Alle Schriften werden beim Build von next/font selbst gehostet (kein Google-Request im Browser).
// Lizenzen: Bricolage Grotesque, Montserrat, Merriweather, Poppins, Oswald, Fredoka, VT323, Lato = SIL OFL;
// Open Sans = Apache 2.0 (laut RECHERCHE-MARKT.md und Google Fonts; vor Livegang je Schrift belegen).
// next/font verlangt literale Optionen (kein Spread).
import {
  Bricolage_Grotesque, Montserrat, Merriweather, Poppins, Oswald, Fredoka, VT323, Lato, Open_Sans,
} from "next/font/google";

const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"], weight: ["600", "700", "800"], variable: "--font-shop-display", display: "swap",
});
const montserrat = Montserrat({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-montserrat", display: "swap", preload: false });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-merriweather", display: "swap", preload: false });
const poppins = Poppins({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-poppins", display: "swap", preload: false });
const oswald = Oswald({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-oswald", display: "swap", preload: false });
const fredoka = Fredoka({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-fredoka", display: "swap", preload: false });
const vt323 = VT323({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-vt323", display: "swap", preload: false });
const lato = Lato({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-lato", display: "swap", preload: false });
const opensans = Open_Sans({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-opensans", display: "swap", preload: false });

export const fontVariablen = [display, montserrat, merriweather, poppins, oswald, fredoka, vt323, lato, opensans]
  .map((f) => f.variable)
  .join(" ");
