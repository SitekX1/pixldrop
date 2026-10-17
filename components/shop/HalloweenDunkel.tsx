// Dunkler Halloween-Look fuer die Shop-Hauptseite (data-saison="halloween-dark"): eigene SVG-/CSS-Grafiken, kein Bild.
// Dekorativ: aria-hidden, pointer-events:none, hinter dem Inhalt. Bewegung nur transform/opacity, bei prefers-reduced-motion statisch (shop.css "hwd-").

function Netz({ className }: { className: string }) {
  return (
    <svg className={`hwd-web ${className}`} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M0 0 L160 0 M0 0 L0 160 M0 0 L146 84 M0 0 L84 146 M0 0 L158 40 M0 0 L40 158 M0 0 L120 120" />
        <path d="M22 0 Q18 18 0 22 M46 0 Q36 36 0 46 M72 0 Q56 56 0 72 M100 0 Q78 78 0 100 M132 0 Q104 104 0 132 M158 0 Q128 128 0 158" />
      </g>
    </svg>
  );
}

function Fledermaus({ className }: { className: string }) {
  return (
    <svg className={`hwd-bat ${className}`} viewBox="0 0 44 24" aria-hidden="true" focusable="false">
      <g className="hwd-wings">
        <path d="M22 22 L19 14 C15 17 9 16 6 11 C4 14 2 14 0 12 C2 8 3 4 4 1 C8 5 12 5 16 6 L19 4 L22 9 L25 4 L28 6 C32 5 36 5 40 1 C41 4 42 8 44 12 C42 14 40 14 38 11 C35 16 29 17 25 14 Z" fill="currentColor" />
      </g>
    </svg>
  );
}

function Spinne({ className, faden }: { className: string; faden: number }) {
  const y = faden;
  return (
    <svg className={`hwd-spider ${className}`} viewBox={`0 0 40 ${y + 30}`} aria-hidden="true" focusable="false">
      <path d={`M20 0 L20 ${y}`} stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <g transform={`translate(20 ${y + 10})`}>
        <ellipse cx="0" cy="4" rx="6" ry="7.5" fill="#050d0d" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="0" cy="-4.5" r="3.6" fill="#050d0d" stroke="currentColor" strokeWidth="0.8" />
        <path d="M-5 0 L-13 -6 M-5 3 L-15 3 M-5 6 L-13 12 M-4 8 L-9 16 M5 0 L13 -6 M5 3 L15 3 M5 6 L13 12 M4 8 L9 16" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="-1.4" cy="-4.8" r="0.9" fill="#5cf5d3" />
        <circle cx="1.4" cy="-4.8" r="0.9" fill="#5cf5d3" />
      </g>
    </svg>
  );
}

export default function HalloweenDunkel() {
  return (
    <div className="hwd" aria-hidden="true">
      <div className="hwd-moon" />
      <div className="hwd-fog hwd-fog--1" />
      <div className="hwd-fog hwd-fog--2" />
      <div className="hwd-fog hwd-fog--3" />
      <Netz className="hwd-web--tl" />
      <Netz className="hwd-web--tr" />
      <Netz className="hwd-web--bl" />
      <Netz className="hwd-web--br" />
      <Spinne className="hwd-spider--1" faden={120} />
      <Spinne className="hwd-spider--2" faden={70} />
      <Spinne className="hwd-spider--3" faden={90} />
      <Fledermaus className="hwd-bat--1" />
      <Fledermaus className="hwd-bat--2" />
      <Fledermaus className="hwd-bat--3" />
    </div>
  );
}
