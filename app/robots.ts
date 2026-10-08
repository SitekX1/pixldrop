import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /3d-druck: Shop-Gerüst, noch nicht öffentlich
      disallow: ["/stats", "/3d-druck"],
    },
    sitemap: "https://pixldrop.de/sitemap.xml",
  };
}
