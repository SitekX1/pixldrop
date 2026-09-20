"use client";

import { useEffect, useRef } from "react";
import SpotifyEmbed from "./SpotifyEmbed";

export default function SongCard({
  title,
  trackId,
  cover,
  expanded,
  onExpand,
}: {
  title: string;
  trackId: string;
  cover: string;
  expanded: boolean;
  onExpand: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expanded]);

  return (
    <div ref={cardRef} className={`card${expanded ? " song-card-expanded" : ""}`}>
      <div className="song-cover">
        <img src={cover} alt="" />
      </div>
      <div className="song-title">{title}</div>
      <SpotifyEmbed trackId={trackId} title={title} loaded={expanded} onLoad={onExpand} />
    </div>
  );
}
