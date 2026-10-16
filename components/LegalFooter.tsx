// Rechtliche Pflichtlinks. Müssen von JEDER Seite aus unmittelbar erreichbar sein,
// deshalb als eigene Komponente statt pro Seite dupliziert.
import { SHOP_SICHTBAR } from "@/lib/shop/config";

// Grußvideos sind noch nicht öffentlich und werden hier nicht genannt.
// - Shop nicht öffentlich: Links wie bisher ("AGB", "Widerrufsrecht").
// - Shop öffentlich: die AGB und die Widerrufsbelehrung des 3D-Druck-Shops (die Grußvideo-Seiten /agb und /widerrufsrecht bleiben per Adresse erreichbar).
// Beim späteren Start der Grußvideos hier wieder beide Angebote benennen.
export default function LegalFooter() {
  return (
    <div className="footer-links">
      <a href="/impressum">Impressum</a>
      <a href="/datenschutz">Datenschutz</a>
      {SHOP_SICHTBAR ? (
        <>
          <a href="/3d-druck/agb">AGB</a>
          <a href="/3d-druck/widerruf">Widerrufsbelehrung</a>
        </>
      ) : (
        <>
          <a href="/agb">AGB</a>
          <a href="/widerrufsrecht">Widerrufsrecht</a>
        </>
      )}
    </div>
  );
}
