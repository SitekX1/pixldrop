import type { MetadataRoute } from "next";
import { SHOP_SICHTBAR } from "@/lib/shop/config";
import { sichtbareProdukte } from "@/lib/shop/produkte";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://pixldrop.de";
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pixlgame`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...(SHOP_SICHTBAR ? [{ url: `${base}/3d-druck`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    // Artikelseiten des Shops (Halloween-Artikel nur, solange SHOP_HALLOWEEN nicht "off" ist)
    ...(SHOP_SICHTBAR ? sichtbareProdukte().map((p) => ({ url: `${base}/3d-druck/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })) : []),
    { url: `${base}/impressum`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/datenschutz`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
