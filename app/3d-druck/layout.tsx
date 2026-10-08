import type { Metadata } from "next";
import "./shop.css";
import { fontVariablen } from "./fonts";

// Shop-Gerüst: nicht öffentlich, nicht indexiert, nicht verlinkt (robots.ts sperrt /3d-druck zusätzlich).
export const metadata: Metadata = {
  title: { default: "3D-Druck — PixlDrop", template: "%s — 3D-Druck, PixlDrop" },
  description: "Untersetzer und mehr, in Asbach-Bäumenheim gedruckt.",
  robots: { index: false, follow: false, nocache: true },
  openGraph: null,
  twitter: null,
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className={fontVariablen}>{children}</div>;
}
