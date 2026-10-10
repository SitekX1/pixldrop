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

export default function IndividuellBanner() {
  return (
    <section className="shop-indbanner" aria-labelledby="ind-titel">
      <div className="ind-text">
        <h2 id="ind-titel">Etwas Eigenes? <span>Preis nach Anfrage</span></h2>
        <p>Beschreib deine Idee, lade ein Foto hoch, du bekommst ein unverbindliches Angebot.</p>
      </div>
      <Deko />
      <Link className="shop-btn" href="/3d-druck/anfrage">Individuell anfragen</Link>
    </section>
  );
}
