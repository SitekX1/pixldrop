// Große, fast transparente Hintergrundmarke der Startseite. Parallax rein per CSS (start.css, animation-timeline), ohne JS.
export default function LogoMarke() {
  return (
    <div className="sx-marke" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/shop/logo-pixldrop-3d.webp" alt="" width={800} height={800} decoding="async" />
    </div>
  );
}
