// Rechtliche Pflichtlinks. Müssen von JEDER Seite aus unmittelbar erreichbar sein,
// deshalb als eigene Komponente statt pro Seite dupliziert.
export default function LegalFooter() {
  return (
    <div className="footer-links">
      <a href="/impressum">Impressum</a>
      <a href="/datenschutz">Datenschutz</a>
      <a href="/agb">AGB</a>
      <a href="/widerrufsrecht">Widerrufsrecht</a>
    </div>
  );
}
