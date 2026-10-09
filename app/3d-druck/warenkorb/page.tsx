import ShopShell from "@/components/shop/ShopShell";
import Warenkorb from "@/components/shop/Warenkorb";
import { sichtbareProdukte } from "@/lib/shop/produkte";
import { holeFarben } from "@/lib/shop/farben";

export const dynamic = "force-dynamic";
export const metadata = { title: "Warenkorb" };

export default async function WarenkorbSeite() {
  const farben = await holeFarben();
  return (
    <ShopShell>
      <div className="shop-wrap shop-wrap--kasse">
        <h1 style={{ fontSize: "clamp(1.75rem, 7vw, 2.4rem)", marginBottom: 16 }}>Dein Warenkorb</h1>
        <Warenkorb produkte={sichtbareProdukte()} farben={farben} />
      </div>
    </ShopShell>
  );
}
