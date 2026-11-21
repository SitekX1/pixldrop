import Link from "next/link";
import ShopShell from "@/components/shop/ShopShell";
import PauseBanner from "@/components/shop/PauseBanner";
import WandKonfigurator from "@/components/shop/WandKonfigurator";

export const metadata = { title: "Wandbuchstaben konfigurieren" };

export default function Wandbuchstaben() {
  return (
    <ShopShell banner={<PauseBanner />}>
      <div className="shop-wrap" style={{ paddingBottom: 72 }}>
        <Link className="shop-crumb" href="/3d-druck#wand">← Alle Stücke</Link>
        <WandKonfigurator />
      </div>
    </ShopShell>
  );
}
