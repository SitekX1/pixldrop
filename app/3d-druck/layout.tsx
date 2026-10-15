import type { Metadata } from "next";
import "./shop.css";
import { fontVariablen } from "./fonts";
import { SHOP_AKTIV, ENTWURF_MODUS } from "@/lib/shop/config";

// Bis zum Livegang (SHOP_AKTIV=true und ENTWURF=false): nicht indexiert, nicht verlinkt (robots.ts sperrt /3d-druck zusätzlich).
const LIVE = SHOP_AKTIV && !ENTWURF_MODUS;
export const metadata: Metadata = {
  title: { default: "3D-Druck — PixlDrop", template: "%s — 3D-Druck, PixlDrop" },
  description: "Untersetzer, Halloween-Deko und Individuelles aus dem 3D-Drucker.",
  robots: LIVE ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
  openGraph: null,
  twitter: null,
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className={fontVariablen}>{children}</div>;
}
