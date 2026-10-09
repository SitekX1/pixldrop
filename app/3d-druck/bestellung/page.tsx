import ShopShell from "@/components/shop/ShopShell";
import Bestellablauf from "@/components/shop/Bestellablauf";
import { sichtbareProdukte } from "@/lib/shop/produkte";
import { holeFarben } from "@/lib/shop/farben";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bestellung" };

export default async function Bestellung({ searchParams }: { searchParams: Promise<{ schritt?: string; zahlung?: string }> }) {
  const { schritt, zahlung } = await searchParams;
  const s = schritt === "3" ? 3 : 2; // Schritt 1 ist der Warenkorb unter /3d-druck/warenkorb
  const farben = await holeFarben();
  return (
    <ShopShell>
      <div className="shop-wrap shop-wrap--kasse">
        <Bestellablauf schritt={s} produkte={sichtbareProdukte()} farben={farben} zahlung={zahlung} />
      </div>
    </ShopShell>
  );
}
