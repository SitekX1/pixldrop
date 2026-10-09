// Sichtbarer Entwurf-Hinweis auf den Rechtsseiten; verschwindet über ENTWURF_MODUS (lib/shop/config.ts).
import { ENTWURF_MODUS } from "@/lib/shop/config";

export default function EntwurfBanner() {
  if (!ENTWURF_MODUS) return null;
  return (
    <div className="shop-entwurf" role="note">
      ENTWURF – noch nicht rechtsverbindlich
    </div>
  );
}
