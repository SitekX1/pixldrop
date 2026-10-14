// Echte Textbreite im Browser (mit der gewählten Schrift gemessen, nicht geschätzt).
// Nur im Browser verfügbar; auf dem Server liefert messeEm null, dort gilt weiter die Schätzung (textformat.ts).
let span: HTMLSpanElement | null = null;

/** Breite von text in em (bei Schriftgröße 100 px gemessen). null, wenn nicht messbar. */
export function messeEm(text: string, family: string, fett: boolean, kursiv: boolean): number | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (!span) {
    span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    Object.assign(span.style, { position: "absolute", left: "-9999px", top: "0", visibility: "hidden", whiteSpace: "pre", fontSize: "100px", lineHeight: "1", pointerEvents: "none" });
    document.body.appendChild(span);
  }
  span.style.fontFamily = family;
  span.style.fontWeight = fett ? "700" : "400";
  span.style.fontStyle = kursiv ? "italic" : "normal";
  span.textContent = text;
  const w = span.getBoundingClientRect().width;
  return w > 0 ? w / 100 : null;
}
