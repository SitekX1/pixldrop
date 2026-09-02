import GameApp from "@/components/pixlgame/GameApp";

export const metadata = { title: "Eddie's Café — PixlDrop", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PixlGamePage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.PIXLGAME_SECRET;

  if (!secret || key !== secret) {
    return (
      <main style={styles.page}>
        <form style={styles.gate} method="get">
          <p style={styles.gateLabel}>Passwort</p>
          <input type="password" name="key" autoFocus style={styles.gateInput} />
          <button type="submit" style={styles.gateButton}>
            Ansehen
          </button>
        </form>
      </main>
    );
  }

  return <GameApp />;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "28px 18px 60px",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  gate: { display: "flex", flexDirection: "column", gap: 10, width: 240 },
  gateLabel: { fontSize: "0.85rem", color: "var(--text-muted)" },
  gateInput: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "12px 14px",
    color: "var(--text)",
    fontSize: "1rem",
  },
  gateButton: {
    background: "var(--gradient)",
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
  },
};
