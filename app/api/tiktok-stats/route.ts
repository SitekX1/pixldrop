import { NextResponse } from "next/server";
import { fetchTikTokStats } from "@/lib/windsor";

export const revalidate = 3600;

export async function GET() {
  const stats = await fetchTikTokStats();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600" },
  });
}
