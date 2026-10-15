import type { MetadataRoute } from "next";
import { SHOP_AKTIV, ENTWURF_MODUS } from "@/lib/shop/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /3d-druck: Shop-Gerüst, noch nicht öffentlich
      disallow: SHOP_AKTIV && !ENTWURF_MODUS ? ["/stats"] : ["/stats", "/3d-druck"],
    },
    sitemap: "https://pixldrop.de/sitemap.xml",
  };
}
