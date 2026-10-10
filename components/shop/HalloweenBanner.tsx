import Link from "next/link";
import { HALLOWEEN_ENDE_TEXT, type HalloweenModus } from "@/lib/shop/config";

function Fledermaus({ className }: { className: string }) {
  return (
    <svg className={`hw-bat ${className}`} width="44" height="24" viewBox="0 0 44 24" aria-hidden="true" focusable="false">
      <g className="hw-wings">
        <path d="M22 22 L19 14 C15 17 9 16 6 11 C4 14 2 14 0 12 C2 8 3 4 4 1 C8 5 12 5 16 6 L19 4 L22 9 L25 4 L28 6 C32 5 36 5 40 1 C41 4 42 8 44 12 C42 14 40 14 38 11 C35 16 29 17 25 14 Z" fill="#ff8a1f" />
      </g>
      <circle cx="19.5" cy="9" r="1" fill="#1f1428" />
      <circle cx="24.5" cy="9" r="1" fill="#1f1428" />
    </svg>
  );
}

function Netz({ className }: { className: string }) {
  return (
    <svg className={`hw-web ${className}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#e8dcf5" strokeWidth="1.2" strokeLinecap="round">
        <path d="M0 0 L120 0 M0 0 L0 120 M0 0 L104 62 M0 0 L62 104 M0 0 L118 28 M0 0 L28 118" />
        <path d="M30 0 Q24 24 0 30 M60 0 Q48 48 0 60 M90 0 Q72 72 0 90 M116 0 Q96 96 0 116" />
      </g>
      <g transform="translate(78 52)" className="hw-spider">
        <path d="M0 -52 L0 -6" stroke="#e8dcf5" strokeWidth="1" />
        <ellipse cx="0" cy="3" rx="6" ry="7" fill="#3a2458" stroke="#e8dcf5" strokeWidth="0.6" />
        <circle cx="0" cy="-4" r="3.6" fill="#3a2458" stroke="#e8dcf5" strokeWidth="0.6" />
        <path d="M-5 0 L-12 -4 M-5 3 L-13 4 M-5 6 L-11 11 M5 0 L12 -4 M5 3 L13 4 M5 6 L11 11" stroke="#e8dcf5" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="-1.4" cy="-4.4" r="0.9" fill="#ff8a1f" />
        <circle cx="1.4" cy="-4.4" r="0.9" fill="#ff8a1f" />
      </g>
    </svg>
  );
}

function Kuerbis({ className }: { className: string }) {
  return (
    <svg className={`hw-pumpkin ${className}`} width="96" height="88" viewBox="0 0 96 88" aria-hidden="true" focusable="false">
      <path d="M46 18 C46 10 50 6 56 4 L58 8 C54 10 53 14 53 18 Z" fill="#6b8f2a" />
      <ellipse cx="24" cy="50" rx="22" ry="30" fill="#e8700f" />
      <ellipse cx="72" cy="50" rx="22" ry="30" fill="#e8700f" />
      <ellipse cx="48" cy="50" rx="28" ry="33" fill="#ff8a1f" />
      <path d="M48 18 C40 34 40 66 48 83 M30 22 C20 38 22 62 32 78 M66 22 C76 38 74 62 64 78" stroke="#b84e05" strokeWidth="2" fill="none" opacity="0.55" />
      <g className="hw-glow" fill="#ffe08a">
        <path d="M28 40 L40 40 L34 52 Z" />
        <path d="M56 40 L68 40 L62 52 Z" />
        <path d="M24 62 Q30 58 34 64 L40 62 L44 68 L50 62 L56 68 L60 62 L66 64 Q70 58 74 62 Q70 78 48 78 Q28 78 24 62 Z" />
      </g>
    </svg>
  );
}

function Geist({ className }: { className: string }) {
  return (
    <svg className={`hw-ghost ${className}`} width="60" height="74" viewBox="0 0 60 74" aria-hidden="true" focusable="false">
      <path d="M6 70 L6 30 C6 12 18 2 30 2 C42 2 54 12 54 30 L54 70 L45 62 L37 70 L30 62 L23 70 L15 62 Z" fill="#f4ecff" />
      <ellipse cx="21" cy="30" rx="4.5" ry="6.5" fill="#1f1428" />
      <ellipse cx="39" cy="30" rx="4.5" ry="6.5" fill="#1f1428" />
      <ellipse cx="30" cy="46" rx="5" ry="6" fill="#1f1428" />
    </svg>
  );
}

// Statisch, ohne Countdown (Enddatum nur als Text). Bewegung nur per CSS (prefers-reduced-motion beachtet).
export default function HalloweenBanner({ modus }: { modus: HalloweenModus }) {
  if (modus === "off") return null;
  return (
    <section className="shop-halloween" aria-labelledby="hw-titel">
      <div className="hw-deko" aria-hidden="true">
        <Netz className="hw-web--tl" />
        <Netz className="hw-web--br" />
        <Fledermaus className="hw-bat--1" />
        <Fledermaus className="hw-bat--2" />
        <Geist className="hw-ghost--1" />
        <Kuerbis className="hw-pumpkin--1" />
        <Kuerbis className="hw-pumpkin--2" />
      </div>
      <div className="hw-text">
        <p className="shop-overline">Happy Halloween</p>
        <h2 id="hw-titel">Bis Anfang November dürfen sie spuken.</h2>
        <p>
          Laternen, Geister und Untersetzer für den Herbst, {HALLOWEEN_ENDE_TEXT}.
          {modus === "preview" && " Noch nicht bestellbar: Du kannst schon stöbern, der Verkauf startet später."}
        </p>
        <Link className="shop-btn" href="/3d-druck?kategorie=halloween" scroll>Spuk ansehen</Link>
      </div>
    </section>
  );
}
