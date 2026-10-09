// Alle Schriften werden beim Build von next/font selbst gehostet (kein Google-Request im Browser).
// Lizenz aller Schriften: SIL Open Font License 1.1 (laut Google Fonts; vor Livegang je Schrift belegen).
// next/font verlangt literale Optionen (kein Spread).
import {
  Bricolage_Grotesque, Montserrat, Oswald, Dancing_Script, Pacifico, Caveat, Satisfy, Lobster,
  Permanent_Marker, Bangers, Righteous, Playfair_Display, Cinzel,
} from "next/font/google";

const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"], weight: ["600", "700", "800"], variable: "--font-shop-display", display: "swap",
});
const montserrat = Montserrat({ subsets: ["latin"], weight: ["700", "900"], style: ["normal", "italic"], variable: "--font-sf-montserrat", display: "swap", preload: false });
const oswald = Oswald({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-oswald", display: "swap", preload: false });
const dancing = Dancing_Script({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-dancing", display: "swap", preload: false });
const pacifico = Pacifico({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-pacifico", display: "swap", preload: false });
const caveat = Caveat({ subsets: ["latin"], weight: ["700"], variable: "--font-sf-caveat", display: "swap", preload: false });
const satisfy = Satisfy({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-satisfy", display: "swap", preload: false });
const lobster = Lobster({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-lobster", display: "swap", preload: false });
const marker = Permanent_Marker({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-marker", display: "swap", preload: false });
const bangers = Bangers({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-bangers", display: "swap", preload: false });
const righteous = Righteous({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-righteous", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "900"], style: ["normal", "italic"], variable: "--font-sf-playfair", display: "swap", preload: false });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["700", "900"], variable: "--font-sf-cinzel", display: "swap", preload: false });

export const fontVariablen = [
  display, montserrat, oswald, dancing, pacifico, caveat, satisfy, lobster, marker, bangers, righteous, playfair, cinzel,
].map((f) => f.variable).join(" ");
