import Link from "next/link";
import ShopShell from "@/components/shop/ShopShell";
import PauseBanner from "@/components/shop/PauseBanner";
import { PRODUKTE, istBestellbar } from "@/lib/shop/produkte";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";
import WandKonfigurator from "@/components/shop/WandKonfigurator";

export const metadata = { title: "Wandbuchstaben konfigurieren" };

export default async function Wandbuchstaben() {
  const { farbenAus } = await holeEinstellungen();
  const p = PRODUKTE.find((x) => x.slug === "wandbuchstaben");
  return (
    <ShopShell banner={<PauseBanner />}>
      <div className="shop-wrap" style={{ paddingBottom: 72 }}>
        <Link className="shop-crumb" href="/3d-druck#wand">← Alle Stücke</Link>
        <WandKonfigurator bestellbar={!!p && istBestellbar(p)} farbenAus={farbenAus} />
      </div>
    </ShopShell>
  );
}
