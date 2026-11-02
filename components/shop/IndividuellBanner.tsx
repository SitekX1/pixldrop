import Link from "next/link";

// Ruhiger Sonderposten-Banner (nicht saisonal): Schichten, Maßband, Foto-Idee. Statisch, keine Animation.
function Deko() {
  return (
    <svg className="ind-deko" viewBox="0 0 150 64" width="150" height="64" aria-hidden="true" focusable="false">
      {/* Druckschichten */}
      <g fill="#f0bb55" stroke="#2e1c0f" strokeWidth="2" strokeLinejoin="round">
        <rect x="6" y="44" width="52" height="9" rx="3" />
        <rect x="10" y="34" width="44" height="9" rx="3" fill="#f7e6bd" />
        <rect x="14" y="24" width="36" height="9" rx="3" />
        <rect x="18" y="14" width="28" height="9" rx="3" fill="#f7e6bd" />
      </g>
      {/* Maßband */}
      <g transform="translate(70 12) rotate(-8)">
        <rect width="70" height="16" rx="3" fill="#fffdf9" stroke="#2e1c0f" strokeWidth="2" />
        <path d="M8 16 V10 M16 16 V6 M24 16 V10 M32 16 V6 M40 16 V10 M48 16 V6 M56 16 V10 M64 16 V6" stroke="#2e1c0f" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* Foto-Idee */}
      <g transform="translate(86 36)">
        <rect width="46" height="24" rx="5" fill="#fffdf9" stroke="#2e1c0f" strokeWidth="2" />
        <circle cx="14" cy="9" r="3.4" fill="#f0bb55" stroke="#2e1c0f" strokeWidth="1.6" />
        <path d="M4 21 L16 13 L24 18 L32 11 L42 21 Z" fill="#f7e6bd" stroke="#2e1c0f" strokeWidth="1.6" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// Ruhige, einheitliche Linien-Icons (ein Strichstil, ohne Fuellung/Verlauf) fuer das Weihnachts-Theme: Schichten, Maßband, Foto.
function Linien() {
  const a = { viewBox: "0 0 24 24", width: 26, height: 26, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: "false" as const };
  return (
    <div className="ind-linien" aria-hidden="true">
      <span><svg {...a}><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></svg></span>
      <span><svg {...a}><rect x="2.5" y="8" width="19" height="8" rx="1.5" /><path d="M6 8v3M10 8v4M14 8v3M18 8v4" /></svg></span>
      <span><svg {...a}><rect x="3" y="4.5" width="18" height="15" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4" /></svg></span>
    </div>
  );
}

export default function IndividuellBanner({ pausiert = false, linien = false }: { pausiert?: boolean; linien?: boolean }) {
  return (
    <section className="shop-indbanner" aria-labelledby="ind-titel">
      <div className="ind-text">
        <h2 id="ind-titel">Etwas Eigenes? <span>Preis nach Anfrage</span></h2>
        <p>Beschreib deine Idee, lade ein Foto hoch, du bekommst ein unverbindliches Angebot.</p>
      </div>
      {linien ? <Linien /> : <Deko />}
      {pausiert ? (
        <div>
          <span className="shop-btn shop-btn--aus" role="link" aria-disabled="true">Individuell anfragen</span>
          <p className="shop-aus-hinweis">Vorübergehend pausiert</p>
        </div>
      ) : (
        <Link className="shop-btn" href="/3d-druck/anfrage">Individuell anfragen</Link>
      )}
    </section>
  );
}
