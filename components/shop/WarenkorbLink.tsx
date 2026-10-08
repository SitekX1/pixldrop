"use client";
import { useEffect, useState } from "react";
import { ladeAuswahl } from "@/lib/shop/auswahl";

// "Dein Stück (1)" nur sichtbar, wenn im Tab eine Auswahl liegt (sessionStorage, lokal).
export default function WarenkorbLink() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const lies = () => setN(ladeAuswahl() ? 1 : 0);
    lies();
    window.addEventListener("shop-auswahl", lies);
    return () => window.removeEventListener("shop-auswahl", lies);
  }, []);
  if (!n) return <span />;
  return <a href="/3d-druck/bestellung?schritt=1">Dein Stück ({n})</a>;
}
