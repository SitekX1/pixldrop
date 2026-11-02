// Prominentes "Coming soon"-Siegel (Schleifenband in Cranberry mit Goldrand, Fraunces kursiv) fuer die Weihnachtskacheln.
// Dekorativer Glanz (CSS, nur transform) wandert gelegentlich ueber das Band; bei prefers-reduced-motion statisch (Regeln in app/globals.css, .wn-siegel*).
export default function WeihnachtenSiegel({ text, className = "", fontClass = "" }: { text: string; className?: string; fontClass?: string }) {
  const stern = (
    <svg className="wn-siegel-stern" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M12 1.5 14.6 9.4 22.5 12 14.6 14.6 12 22.5 9.4 14.6 1.5 12 9.4 9.4Z" fill="currentColor" />
    </svg>
  );
  return (
    <span className={`wn-siegel-wrap ${className}`}>
      <span className={`wn-siegel ${fontClass}`}>
        {stern}<span className="wn-siegel-text">{text}</span>{stern}
      </span>
    </span>
  );
}
