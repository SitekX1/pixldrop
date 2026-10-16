/**
 * Amazon-Partnerlink für passende LED-Teelichter (Alex 16.10.2026, PartnerNet-ID pixldrop-21).
 * Nur auf Produktseiten, nie in E-Mails, PDFs oder gedruckten Karten (Amazon-Programmrichtlinien).
 * Keine Amazon-Preise anzeigen. Link auf null setzen = Kasten verschwindet.
 */
export const LED_PARTNERLINK: string | null = "https://www.amazon.de/dp/B09ZXYZCNP?tag=pixldrop-21";

/** Artikel, die mit LED-Teelicht genutzt werden. */
export const LED_ARTIKEL = ["geister-set", "kuerbis-laterne", "kuerbis-teelichthalter"] as const;

export function ledPartnerlink(slug: string): string | null {
  return LED_PARTNERLINK && (LED_ARTIKEL as readonly string[]).includes(slug) ? LED_PARTNERLINK : null;
}
