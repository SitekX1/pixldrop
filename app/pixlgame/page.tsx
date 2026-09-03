import type { Viewport } from "next";
import GameApp from "@/components/pixlgame/GameApp";

export const metadata = { title: "Eddie's Café — PixlDrop", robots: { index: false, follow: false } };
// viewportFit "cover" ist Voraussetzung dafür, dass env(safe-area-inset-*) auf iOS
// überhaupt echte Werte liefert (statt immer 0) — ohne das laufen alle Safe-Area-Fixes
// im ShootingGallery-HUD nur auf ihren Fallback-Werten, unabhängig vom echten Gerät.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export const dynamic = "force-dynamic";

export default async function PixlGamePage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;
  return <GameApp src={src === "tiktok" || src === "instagram" ? src : undefined} />;
}
