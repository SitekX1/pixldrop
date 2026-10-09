import type { Metadata } from "next";
import ShopShell from "@/components/shop/ShopShell";
import FreigabeSeite from "@/components/shop/FreigabeSeite";

// Nur für Alex (Link aus Telegram). Nicht indexiert, nicht in Sitemap/Navigation.
export const metadata: Metadata = {
  title: "Textfreigabe",
  robots: { index: false, follow: false, nocache: true },
};

export default async function Freigabe({ searchParams }: { searchParams: Promise<{ b?: string; t?: string; a?: string }> }) {
  const { b, t, a } = await searchParams;
  return (
    <ShopShell>
      <div className="shop-wrap">
        <FreigabeSeite b={typeof b === "string" ? b : ""} t={typeof t === "string" ? t : ""} vorauswahl={a === "nein" ? "nein" : "ok"} />
      </div>
    </ShopShell>
  );
}
