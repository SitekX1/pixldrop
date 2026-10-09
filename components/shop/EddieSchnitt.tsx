// Eddie als freigestellter Halbfigur-Ausschnitt aus dem bestehenden Asset
// (public/pixlgame-media/eddie-iso.png). Kann später durch eigene Shop-Assets ersetzt werden.
export default function EddieSchnitt({ className, priority = false }: { className: string; priority?: boolean }) {
  return (
    <div className={className} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pixlgame-media/eddie-iso.png"
        alt=""
        width={480}
        height={643}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}
