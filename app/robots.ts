import type { MetadataRoute } from "next";
import { SHOP_SICHTBAR } from "@/lib/shop/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /3d-druck: Shop-Gerüst, noch nicht öffentlich
      disallow: SHOP_SICHTBAR ? ["/stats"] : ["/stats", "/3d-druck"],
    },
    sitemap: "https://pixldrop.de/sitemap.xml",
  };
}
