import { getClickStats, getPixlgameLeaderboard, EVENT_LABELS } from "@/lib/click-stats";
import type { ClickBreakdown } from "@/lib/click-stats";

export const metadata = { title: "Stats — PixlDrop", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("de-DE");
}

function groupByEvent(rows: ClickBreakdown[]) {
  const groups = new Map<string, { total: number; details: { detail: string; count: number }[] }>();
  for (const row of rows) {
    const g = groups.get(row.eventName) ?? { total: 0, details: [] };
    g.total += row.count;
    if (row.detail) g.details.push({ detail: row.detail, count: row.count });
    groups.set(row.eventName, g);
  }
  return groups;
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
          <input type="password" name="key" autoFocus style={styles.gateInput} />
          <button type="submit" style={styles.gateButton}>
            Ansehen
          </button>
        </form>
      </main>
    );
  }

  const [data, leaderboard] = await Promise.all([getClickStats(), getPixlgameLeaderboard(100)]);
  const groups7d = groupByEvent(data.breakdown7d);
  const groups30d = groupByEvent(data.breakdown30d);
  const eventNames = Array.from(new Set([...groups7d.keys(), ...groups30d.keys(), ...Object.keys(EVENT_LABELS)]));

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>PixlDrop Klick-Stats</h1>

      {data.error ? (
        <p style={styles.error}>Fehler beim Laden: {data.error}</p>
      ) : (
        <section style={styles.list}>
          {eventNames.map((name) => {
            const g7 = groups7d.get(name);
            const g30 = groups30d.get(name);
            return (
              <div key={name} style={styles.eventBlock}>
                <div style={styles.eventHeader}>
                  <span>{EVENT_LABELS[name] ?? name}</span>
                  <span style={styles.eventCounts}>
                    {fmt(g7?.total ?? 0)} / 7T · {fmt(g30?.total ?? 0)} / 30T
                  </span>
                </div>
                {(g30?.details.length ?? 0) > 0 && (
                  <div style={styles.detailList}>
                    {g30!.details
                      .sort((a, b) => b.count - a.count)
                      .map((d) => (
                        <div key={d.detail} style={styles.detailRow}>
                          <span>{d.detail}</span>
                          <span>{fmt(d.count)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <h1 style={{ ...styles.h1, marginTop: 32 }}>🏆 Eddie&apos;s Café — Rangliste</h1>
      {leaderboard.error ? (
        <p style={styles.error}>Fehler beim Laden: {leaderboard.error}</p>
      ) : leaderboard.entries.length === 0 ? (
        <p style={{ ...styles.hint, marginTop: 0 }}>Noch keine Einträge.</p>
      ) : (
        <section style={styles.list}>
          {leaderboard.entries.map((entry, i) => (
            <div key={`${entry.playerName}-${entry.createdAt}`} style={styles.rankRow}>
              <span style={styles.rankNumber}>{i + 1}.</span>
              <span style={styles.rankName}>{entry.playerName}</span>
              <span style={styles.rankScore}>{fmt(entry.score)}</span>
              <span style={styles.rankDate}>
                {new Date(entry.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
              </span>
            </div>
          ))}
        </section>
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
  h1: { fontSize: "1.3rem", fontWeight: 800, margin: "0 0 20px" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  eventBlock: {
    background: "#171928",
    border: "1px solid #2a2d45",
    borderRadius: 16,
    padding: "14px 16px",
  },
  eventHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.9rem",
    fontWeight: 700,
  },
  eventCounts: { fontWeight: 700, color: "#8fe6f7" },
  detailList: { marginTop: 8, display: "flex", flexDirection: "column", gap: 4 },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.8rem",
    color: "#b7bade",
  },
  error: { color: "#ff8080", fontSize: "0.9rem" },
  rankRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#171928",
    border: "1px solid #2a2d45",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: "0.85rem",
  },
  rankNumber: { color: "#5a5d7a", fontWeight: 700, width: 26, flexShrink: 0 },
  rankName: { flex: 1, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rankScore: { color: "#8fe6f7", fontWeight: 800 },
  rankDate: { color: "#5a5d7a", fontSize: "0.72rem", width: 52, textAlign: "right", flexShrink: 0 },
  hint: { marginTop: 28, fontSize: "0.72rem", color: "#5a5d7a", textAlign: "center" },
  gate: { display: "flex", flexDirection: "column", gap: 10, marginTop: "35vh" },
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
