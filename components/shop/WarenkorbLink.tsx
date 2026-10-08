"use client";
import { useEffect, useState } from "react";
import { anzahlStuecke, ladeKorb } from "@/lib/shop/auswahl";

// "Warenkorb (2)" im Kopf; zählt Stücke aus dem sessionStorage dieses Tabs (lokal).
export default function WarenkorbLink() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const lies = () => setN(anzahlStuecke(ladeKorb()));
    lies();
    window.addEventListener("shop-auswahl", lies);
    return () => window.removeEventListener("shop-auswahl", lies);
  }, []);
  return (
    <a className="shop-cart-link" href="/3d-druck/warenkorb" aria-label={n ? `Warenkorb, ${n} ${n === 1 ? "Stück" : "Stücke"}` : "Warenkorb, leer"}>
      Warenkorb{n ? ` (${n})` : ""}
    </a>
  );
}
