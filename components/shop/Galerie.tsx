// Produktbild-Container (ein Bild; ein 3D-Viewer ist nicht Teil des Shops).
export default function Galerie({ bild }: { bild: React.ReactNode }) {
  return (
    <div className="shop-gallery" role="region" aria-label="Produktbild">
      <div className="shop-gallery-track">
        <div>{bild}</div>
      </div>
    </div>
  );
}
