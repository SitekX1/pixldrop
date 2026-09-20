"use client";

import { useState } from "react";
import SpotifyEmbed from "./SpotifyEmbed";

export default function SongCard({
  title,
  trackId,
  cover,
}: {
  title: string;
  trackId: string;
  cover: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card${expanded ? " song-card-expanded" : ""}`}>
      <div className="song-cover">
        <img src={cover} alt="" />
      </div>
      <div className="song-title">{title}</div>
      <SpotifyEmbed trackId={trackId} title={title} onLoad={() => setExpanded(true)} />
    </div>
  );
}
