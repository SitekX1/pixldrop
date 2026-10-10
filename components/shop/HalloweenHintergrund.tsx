// Dekorativer Halloween-Hintergrund (nur theme="halloween"): fixed, pointer-events:none, aria-hidden.
// Hinten (z -1): Eck-Netze, Geister, Fledermaeuse, Kuerbis-Glimmer. Vorne (z 1): sehr zarte Faeden ueber dem Inhalt + Spinne.
// Animation nur transform/opacity (CSS, siehe shop.css "hw-bg"), bei prefers-reduced-motion statisch.

function Netz({ className }: { className: string }) {
  return (
    <svg className={`hwb-web ${className}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#e8dcf5" strokeWidth="1.1" strokeLinecap="round">
        <path d="M0 0 L120 0 M0 0 L0 120 M0 0 L104 62 M0 0 L62 104 M0 0 L118 28 M0 0 L28 118" />
        <path d="M24 0 Q19 19 0 24 M48 0 Q38 38 0 48 M72 0 Q58 58 0 72 M96 0 Q77 77 0 96 M118 0 Q96 96 0 118" />
      </g>
    </svg>
  );
}

function Fledermaus({ className }: { className: string }) {
  return (
    <svg className={`hwb-bat ${className}`} viewBox="0 0 44 24" aria-hidden="true" focusable="false">
      <g className="hwb-wings">
        <path d="M22 22 L19 14 C15 17 9 16 6 11 C4 14 2 14 0 12 C2 8 3 4 4 1 C8 5 12 5 16 6 L19 4 L22 9 L25 4 L28 6 C32 5 36 5 40 1 C41 4 42 8 44 12 C42 14 40 14 38 11 C35 16 29 17 25 14 Z" fill="#ff8a1f" />
      </g>
    </svg>
  );
}

function Geist({ className }: { className: string }) {
  return (
    <svg className={`hwb-ghost ${className}`} viewBox="0 0 60 74" aria-hidden="true" focusable="false">
      <path d="M6 70 L6 30 C6 12 18 2 30 2 C42 2 54 12 54 30 L54 70 L45 62 L37 70 L30 62 L23 70 L15 62 Z" fill="#f4ecff" />
      <ellipse cx="21" cy="30" rx="4.5" ry="6.5" fill="#1f1428" />
      <ellipse cx="39" cy="30" rx="4.5" ry="6.5" fill="#1f1428" />
      <ellipse cx="30" cy="46" rx="5" ry="6" fill="#1f1428" />
    </svg>
  );
}

function Spinne({ className }: { className: string }) {
  return (
    <svg className={`hwb-spider ${className}`} viewBox="0 0 30 160" aria-hidden="true" focusable="false">
      <path d="M15 0 L15 118" stroke="#e8dcf5" strokeWidth="1" />
      <g transform="translate(15 128)">
        <ellipse cx="0" cy="3" rx="6" ry="7" fill="#3a2458" stroke="#e8dcf5" strokeWidth="0.6" />
        <circle cx="0" cy="-4" r="3.6" fill="#3a2458" stroke="#e8dcf5" strokeWidth="0.6" />
        <path d="M-5 0 L-12 -4 M-5 3 L-13 4 M-5 6 L-11 11 M5 0 L12 -4 M5 3 L13 4 M5 6 L11 11" stroke="#e8dcf5" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="-1.4" cy="-4.4" r="0.9" fill="#ff8a1f" />
        <circle cx="1.4" cy="-4.4" r="0.9" fill="#ff8a1f" />
      </g>
    </svg>
  );
}

function Glimmer({ className }: { className: string }) {
  return (
    <svg className={`hwb-glimmer ${className}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="18" fill="#ff8a1f" />
      <circle cx="20" cy="20" r="6" fill="#ffe08a" />
    </svg>
  );
}

export default function HalloweenHintergrund() {
  return (
    <>
      <div className="hwb hwb--back" aria-hidden="true">
        <Netz className="hwb-web--tl" />
        <Netz className="hwb-web--tr" />
        <Netz className="hwb-web--bl" />
        <Netz className="hwb-web--br" />
        <Geist className="hwb-ghost--1" />
        <Geist className="hwb-ghost--2" />
        <Geist className="hwb-ghost--3" />
        <Fledermaus className="hwb-bat--1" />
        <Fledermaus className="hwb-bat--2" />
        <Fledermaus className="hwb-bat--3" />
        <Glimmer className="hwb-glimmer--1" />
        <Glimmer className="hwb-glimmer--2" />
        <Glimmer className="hwb-glimmer--3" />
      </div>
      <div className="hwb hwb--front" aria-hidden="true">
        <svg className="hwb-threads" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          <g fill="none" stroke="#e8dcf5" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <path vectorEffect="non-scaling-stroke" d="M0 14 Q38 26 100 8" />
            <path vectorEffect="non-scaling-stroke" d="M0 52 Q50 44 100 70" />
            <path vectorEffect="non-scaling-stroke" d="M0 92 Q44 78 100 96" />
            <path vectorEffect="non-scaling-stroke" d="M14 0 Q22 50 6 100" />
            <path vectorEffect="non-scaling-stroke" d="M90 0 Q80 46 96 100" />
          </g>
        </svg>
        <Spinne className="hwb-spider--1" />
        <Spinne className="hwb-spider--2" />
      </div>
    </>
  );
}
