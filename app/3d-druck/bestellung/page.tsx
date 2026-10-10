import ShopShell from "@/components/shop/ShopShell";
import PauseBanner from "@/components/shop/PauseBanner";
import Bestellablauf from "@/components/shop/Bestellablauf";
import { sichtbareProdukte } from "@/lib/shop/produkte";
import { holeFarben } from "@/lib/shop/farben";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bestellung" };

export default async function Bestellung({ searchParams }: { searchParams: Promise<{ schritt?: string; zahlung?: string }> }) {
  const { schritt, zahlung } = await searchParams;
  const s = schritt === "3" ? 3 : 2; // Schritt 1 ist der Warenkorb unter /3d-druck/warenkorb
  const farben = await holeFarben();
  const { lieferzeit, bestellungPausiert, pauseText, wunschtextPausiert } = await holeEinstellungen();
  return (
    <ShopShell banner={<PauseBanner />}>
      <div className="shop-wrap shop-wrap--kasse">
        <Bestellablauf schritt={s} produkte={sichtbareProdukte()} farben={farben} zahlung={zahlung} lieferzeit={lieferzeit} pausiert={bestellungPausiert} pauseText={pauseText} wunschtextPausiert={wunschtextPausiert} />
      </div>
    </ShopShell>
  );
}
