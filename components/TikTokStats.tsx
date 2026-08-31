import { fetchTikTokStats, formatCount } from "@/lib/windsor";

export default async function TikTokStats() {
  const stats = await fetchTikTokStats();

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-value">{formatCount(stats.followers)}</div>
        <div className="stat-label">Follower</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatCount(stats.likes)}</div>
        <div className="stat-label">Likes</div>
      </div>
    </div>
  );
}
