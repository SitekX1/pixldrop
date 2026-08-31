import { getAnalyticsSnapshot, EVENT_LABELS } from "@/lib/vercel-analytics";

export const metadata = { title: "Stats — PixlDrop", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function fmt(n: number | null) {
  return n == null ? "—" : n.toLocaleString("de-DE");
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.STATS_SECRET;

  if (!secret || key !== secret) {
    return (
      <main style={styles.page}>
        <form style={styles.gate} method="get">
          <p style={styles.gateLabel}>Passwort</p>
          <input
            type="password"
            name="key"
            autoFocus
            style={styles.gateInput}
          />
          <button type="submit" style={styles.gateButton}>
            Ansehen
          </button>
        </form>
      </main>
    );
  }

  const data = await getAnalyticsSnapshot();

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>PixlDrop Stats</h1>

      {data.error ? (
        <p style={styles.error}>Fehler beim Laden: {data.error}</p>
      ) : (
        <>
          <section style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardValue}>{fmt(data.visitors7d)}</div>
              <div style={styles.cardLabel}>Besucher (7 Tage)</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardValue}>{fmt(data.pageviews7d)}</div>
              <div style={styles.cardLabel}>Seitenaufrufe (7 Tage)</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardValue}>{fmt(data.visitors30d)}</div>
              <div style={styles.cardLabel}>Besucher (30 Tage)</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardValue}>{fmt(data.pageviews30d)}</div>
              <div style={styles.cardLabel}>Seitenaufrufe (30 Tage)</div>
            </div>
          </section>

          <h2 style={styles.h2}>Klicks (30 Tage)</h2>
          {data.events30d ? (
            <section style={styles.list}>
              {Object.entries(data.events30d).map(([name, count]) => (
                <div key={name} style={styles.listRow}>
                  <span>{EVENT_LABELS[name] ?? name}</span>
                  <span style={styles.listValue}>{fmt(count)}</span>
                </div>
              ))}
            </section>
          ) : (
            <p style={styles.notice}>{data.eventsUnavailableReason}</p>
          )}
        </>
      )}

      <p style={styles.hint}>Aktualisiert bei jedem Aufruf dieser Seite.</p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#0b0c14",
    color: "#f2f3fb",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "28px 18px 60px",
    maxWidth: 480,
    margin: "0 auto",
  },
  h1: { fontSize: "1.4rem", fontWeight: 800, margin: "0 0 20px" },
  h2: { fontSize: "1rem", fontWeight: 700, margin: "24px 0 10px", color: "#b7bade" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  card: {
    background: "#171928",
    border: "1px solid #2a2d45",
    borderRadius: 16,
    padding: "16px 14px",
  },
  cardValue: { fontSize: "1.6rem", fontWeight: 800 },
  cardLabel: { fontSize: "0.75rem", color: "#9295b8", marginTop: 4 },
  list: {
    background: "#171928",
    border: "1px solid #2a2d45",
    borderRadius: 16,
    overflow: "hidden",
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #2a2d45",
    fontSize: "0.9rem",
  },
  listValue: { fontWeight: 700 },
  error: { color: "#ff8080", fontSize: "0.9rem" },
  notice: { color: "#9295b8", fontSize: "0.85rem", lineHeight: 1.5 },
  hint: { marginTop: 28, fontSize: "0.72rem", color: "#5a5d7a", textAlign: "center" },
  gate: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: "35vh",
  },
  gateLabel: { fontSize: "0.85rem", color: "#9295b8" },
  gateInput: {
    background: "#171928",
    border: "1px solid #2a2d45",
    borderRadius: 12,
    padding: "12px 14px",
    color: "#f2f3fb",
    fontSize: "1rem",
  },
  gateButton: {
    background: "#3b5bfd",
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1rem",
  },
};
