// Eigene SVG-Zeichnungen für das Weihnachts-Theme (selbst gezeichnet, keine Fremdgrafik, kein Bild-Download).
// "Schicht für Schicht": über den Silhouetten liegt ein feines Schichtlinien-Raster wie bei einem FDM-Druck.
// Dekorativ: Aufrufer setzen aria-hidden. Farben der Figuren sind feste Hex-Werte (Briefing Abschnitt 3), alles andere nimmt Tokens.

/** Tanne, Ursprung unten mittig, ca. 56 x 100. */
export const TANNE_PFAD = "M0 -100 L16 -70 L8 -70 L22 -42 L11 -42 L28 -10 L4 -10 L4 0 L-4 0 L-4 -10 L-28 -10 L-11 -42 L-22 -42 L-8 -70 L-16 -70 Z";

/** Schichtlinien-Muster (3 px Raster, Linie 1 px). Muss im selben SVG wie die Nutzung stehen. */
export function SchichtMuster({ id }: { id: string }) {
  return (
    <pattern id={id} width="3" height="3" patternUnits="userSpaceOnUse">
      <rect y="2" width="3" height="1" fill="rgba(0,0,0,.16)" />
    </pattern>
  );
}

/** Tannenreihe als Silhouette mit Schichtlinien; x/y/s = Position und Maßstab je Baum. */
export function Tannen({ liste, fill, muster }: { liste: [number, number, number][]; fill: string; muster: string }) {
  return (
    <>
      {liste.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d={TANNE_PFAD} fill={fill} />
          <path d={TANNE_PFAD} fill={`url(#${muster})`} />
        </g>
      ))}
    </>
  );
}

/** Vierzack-Stern (Glitzer), Ursprung Mitte, Radius 8. */
export const VIERZACK = "M0 -8 Q1 -1 8 0 Q1 1 0 8 Q-1 1 -8 0 Q-1 -1 0 -8Z";

const REN = "wn-ren-form";

/**
 * Schlitten mit drei Rentieren und Weihnachtsmann, Blick nach links. viewBox 600 x 220.
 * `idp` = Präfix für die internen IDs (mehrere Instanzen pro Seite möglich).
 * Animierbare Gruppen: .wn-ren (1-3), .wn-kopf, .wn-nase, .wn-glitz (1-4), .wn-puff, .wn-santa.
 */
export function SchlittenGrafik({ idp, className }: { idp: string; className?: string }) {
  const f = `${idp}-${REN}`;
  const m = `${idp}-maske`;
  const s = `${idp}-schicht`;
  const rentier = (x: number, y: number, n: number, lead = false) => (
    <g className={`wn-ren wn-ren-${n}`} transform={`translate(${x} ${y})`}>
      <g className="wn-ren-in">
        <use href={`#${f}`} />
        <rect x="-70" y="-130" width="120" height="132" fill={`url(#${s})`} mask={`url(#${m})`} />
        <g className="wn-kopf" style={n === 1 ? undefined : { animation: "none" }}>
          <ellipse cx="-44" cy="-88" rx="12" ry="8.5" transform="rotate(-18 -44 -88)" fill="#8A5A3C" />
          <ellipse cx="-55" cy="-84" rx="6" ry="5" fill="#C99A6E" />
          <path d="M-38 -96 L-33 -104 L-31 -94 Z" fill="#8A5A3C" />
          {lead ? (
            <>
              <circle className="wn-hof" cx="-60" cy="-84" r="9" fill="#FF5A4F" />
              <circle className="wn-nase" cx="-60" cy="-84" r="3.2" fill="#FF5A4F" />
            </>
          ) : (
            <circle cx="-60" cy="-84" r="2.8" fill="#3A2416" />
          )}
          <circle cx="-46" cy="-89" r="1.6" fill="#2B1A10" />
          <path d="M-42 -96 L-40 -112 M-40 -104 L-30 -111 M-40 -112 L-46 -121 M-41 -108 L-34 -120" stroke="#D8B88A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </g>
      </g>
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 600 220" aria-hidden="true" focusable="false">
      <defs>
        <SchichtMuster id={s} />
        <g id={f}>
          <path d="M-22 -58 L-40 -86 L-30 -90 L-10 -62 Z" fill="#8A5A3C" />
          <ellipse cx="0" cy="-50" rx="32" ry="16" fill="#8A5A3C" />
          <ellipse cx="-2" cy="-43" rx="22" ry="7" fill="#C99A6E" />
          <path d="M-22 -40 L-35 -4 M-12 -40 L-19 -2 M16 -40 L27 -6 M26 -42 L41 -14" stroke="#6E4630" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="34" cy="-58" r="4.5" fill="#FFF4E0" />
          <path d="M-20 -63 L-12 -36" stroke="#F0BB55" strokeWidth="3" strokeLinecap="round" />
        </g>
        <mask id={m} maskUnits="userSpaceOnUse" x="-70" y="-130" width="120" height="132" style={{ maskType: "alpha" }}><use href={`#${f}`} /></mask>
      </defs>
      <g transform="translate(0 200)">
        <path d="M100 -58 L168 -60 M210 -58 L278 -60 M320 -58 L368 -56" stroke="#F0BB55" strokeWidth="1.6" fill="none" opacity=".85" />
        {rentier(98, 0, 1, true)}
        {rentier(206, -4, 2)}
        {rentier(314, 0, 3)}
        <g transform="translate(372 0)">
          <path d="M-14 -24 Q-16 -6 2 -6 L190 -6" stroke="#F0BB55" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M22 -6 L24 -26 M150 -6 L148 -28" stroke="#F0BB55" strokeWidth="4" strokeLinecap="round" />
          <path className="wn-sack" d="M118 -44 Q108 -88 150 -94 Q198 -88 188 -50 Z" fill="#7A5230" />
          <path d="M138 -92 L150 -102 L162 -92" stroke="#F0BB55" strokeWidth="3" strokeLinecap="round" fill="none" />
          <g className="wn-santa">
            <path d="M62 -44 Q62 -88 92 -90 Q114 -86 112 -44 Z" fill="#C63A3A" />
            <circle cx="86" cy="-100" r="11" fill="#E9B98F" />
            <path d="M75 -98 Q86 -70 98 -98 Z" fill="#FFF4E0" />
            <path d="M73 -104 Q82 -134 108 -116 Q98 -112 98 -104 Z" fill="#C63A3A" />
            <rect x="73" y="-107" width="25" height="6" rx="3" fill="#FFF4E0" />
            <circle cx="108" cy="-116" r="4.5" fill="#FFF4E0" />
            <path d="M66 -70 L40 -64" stroke="#C63A3A" strokeWidth="7" strokeLinecap="round" />
          </g>
          <path d="M-6 -64 Q0 -26 24 -26 L160 -26 Q186 -28 198 -68 L172 -58 Q152 -44 122 -44 L42 -44 Q10 -48 -6 -64 Z" fill="#B3262F" />
          <path d="M-6 -64 Q0 -26 24 -26 L160 -26 Q186 -28 198 -68 L172 -58 Q152 -44 122 -44 L42 -44 Q10 -48 -6 -64 Z" fill={`url(#${s})`} />
          <path d="M-2 -60 Q4 -30 26 -30 L158 -30" stroke="#F0BB55" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
        <g className="wn-puff" fill="#F4FBFF">
          <circle cx="370" cy="-6" r="9" /><circle cx="396" cy="-3" r="11" /><circle cx="430" cy="-4" r="8" /><circle cx="470" cy="-3" r="10" /><circle cx="520" cy="-5" r="8" />
        </g>
        {[[44, -126, 1], [250, -112, 2], [346, -140, 3], [560, -96, 4]].map(([x, y, n]) => (
          <g key={n} transform={`translate(${x} ${y})`}><path className={`wn-glitz wn-glitz-${n}`} d={VIERZACK} fill="#FFF4E0" /></g>
        ))}
      </g>
    </svg>
  );
}

/** Birne der Lichterkette (Kachel), Ursprung an der Schnur, hängt nach unten. */
export const BIRNE = "M0 0 L0 6 M-6 6 L6 6 L6 11 Q10 21 0 27 Q-10 21 -6 11 Z";
