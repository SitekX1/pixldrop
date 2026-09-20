"use client";

import { useState } from "react";
import SongCard from "./SongCard";

export default function SongGrid({
  songs,
}: {
  songs: { title: string; trackId: string; cover: string }[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="song-grid">
      {songs.map((song) => (
        <SongCard
          key={song.trackId}
          title={song.title}
          trackId={song.trackId}
          cover={song.cover}
          expanded={expandedId === song.trackId}
          onExpand={() => setExpandedId(song.trackId)}
        />
      ))}
    </div>
  );
}
