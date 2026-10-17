// Alle Schriften werden beim Build von next/font selbst gehostet (kein Google-Request im Browser).
// Lizenz aller Schriften: SIL Open Font License 1.1 (laut Google Fonts; vor Livegang je Schrift belegen).
// next/font verlangt literale Optionen (kein Spread).
import {
  Bricolage_Grotesque, Montserrat, Oswald, Dancing_Script, Pacifico, Caveat, Satisfy, Lobster,
  Permanent_Marker, Bangers, Creepster, Righteous, Playfair_Display, Cinzel,
} from "next/font/google";
import localFont from "next/font/local";

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
// Creepster (Halloween-Ueberschriften Hauptseite): SIL OFL 1.1 (belegt 2026-10-17: OFL.txt im Repo google/fonts, ofl/creepster, Copyright 2011 Font Diner, Inc).
const creepster = Creepster({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-creepster", display: "swap", preload: false });
const marker = Permanent_Marker({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-marker", display: "swap", preload: false });
const bangers = Bangers({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-bangers", display: "swap", preload: false });
const righteous = Righteous({ subsets: ["latin"], weight: ["400"], variable: "--font-sf-righteous", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "900"], style: ["normal", "italic"], variable: "--font-sf-playfair", display: "swap", preload: false });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["700", "900"], variable: "--font-sf-cinzel", display: "swap", preload: false });

// 14 zusätzliche Schriften (Eko Bimantara / Khurasan), Dateien UNVERÄNDERT aus ./fonts-frei, selbst gehostet.
// Lizenzen: siehe SCHRIFTEN-LIZENZEN.md (recht-texte im 3D-Druck-Ordner). preload:false = geladen erst, wenn ein Element die Schrift nutzt.
const artsyF = localFont({ src: "./fonts-frei/artsy-morning.otf", weight: "400", style: "normal", variable: "--font-sf-artsy", display: "swap", preload: false, fallback: ["cursive"] });
const bulbearF = localFont({ src: "./fonts-frei/bulbear.otf", weight: "400", style: "normal", variable: "--font-sf-bulbear", display: "swap", preload: false, fallback: ["cursive"] });
const oldwestF = localFont({ src: "./fonts-frei/oldwest.otf", weight: "400", style: "normal", variable: "--font-sf-oldwest", display: "swap", preload: false, fallback: ["cursive"] });
const rosemartinF = localFont({ src: "./fonts-frei/rosemartin.otf", weight: "400", style: "normal", variable: "--font-sf-rosemartin", display: "swap", preload: false, fallback: ["cursive"] });
const roundexF = localFont({ src: "./fonts-frei/roundex.otf", weight: "400", style: "normal", variable: "--font-sf-roundex", display: "swap", preload: false, fallback: ["cursive"] });
const startstoryF = localFont({ src: "./fonts-frei/start-story.ttf", weight: "400", style: "normal", variable: "--font-sf-startstory", display: "swap", preload: false, fallback: ["cursive"] });
const streetyearF = localFont({ src: "./fonts-frei/street-year.ttf", weight: "400", style: "normal", variable: "--font-sf-streetyear", display: "swap", preload: false, fallback: ["cursive"] });
const sallyF = localFont({ src: "./fonts-frei/the-sally.ttf", weight: "400", style: "normal", variable: "--font-sf-sally", display: "swap", preload: false, fallback: ["cursive"] });
const travelliaF = localFont({ src: "./fonts-frei/travellia.ttf", weight: "400", style: "normal", variable: "--font-sf-travellia", display: "swap", preload: false, fallback: ["cursive"] });
const veganF = localFont({ src: "./fonts-frei/vegan-days.ttf", weight: "400", style: "normal", variable: "--font-sf-vegan", display: "swap", preload: false, fallback: ["cursive"] });
const dramaF = localFont({ src: "./fonts-frei/welcome-drama.ttf", weight: "400", style: "normal", variable: "--font-sf-drama", display: "swap", preload: false, fallback: ["cursive"] });
const winterF = localFont({ src: "./fonts-frei/winter-draw.ttf", weight: "400", style: "normal", variable: "--font-sf-winter", display: "swap", preload: false, fallback: ["cursive"] });
const dragonF = localFont({ src: "./fonts-frei/wood-dragon.ttf", weight: "400", style: "normal", variable: "--font-sf-dragon", display: "swap", preload: false, fallback: ["cursive"] });

export const fontVariablen = [
  display, montserrat, oswald, dancing, pacifico, caveat, satisfy, lobster, marker, bangers, creepster, righteous, playfair, cinzel,
  artsyF, bulbearF, oldwestF, rosemartinF, roundexF, startstoryF, streetyearF, sallyF, travelliaF, veganF, dramaF, winterF, dragonF,
].map((f) => f.variable).join(" ");
