// Rechtliche Pflichtlinks. Müssen von JEDER Seite aus unmittelbar erreichbar sein,
// deshalb als eigene Komponente statt pro Seite dupliziert.
import { SHOP_SICHTBAR } from "@/lib/shop/config";

export default function LegalFooter() {
  return (
    <div className="footer-links">
      <a href="/impressum">Impressum</a>
      <a href="/datenschutz">Datenschutz</a>
      <a href="/agb">AGB Grußvideos</a>
      {SHOP_SICHTBAR && <a href="/3d-druck/agb">AGB 3D-Druck-Shop</a>}
      <a href="/widerrufsrecht">Widerrufsrecht Grußvideos</a>
    </div>
  );
}
