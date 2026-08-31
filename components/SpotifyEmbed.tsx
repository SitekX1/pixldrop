"use client";

import { useState } from "react";
import { trackClick } from "@/lib/track";
import { SpotifyIcon } from "./Icons";

export default function SpotifyEmbed({
  trackId,
  title,
}: {
  trackId: string;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <div className="spotify-embed">
        <iframe
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&autoplay=1`}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={title}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="spotify-placeholder"
      onClick={() => {
        trackClick("spotify-embed-load", { song: title });
        setLoaded(true);
      }}
    >
      <span className="spotify-placeholder-icon">
        <SpotifyIcon />
      </span>
      <span className="spotify-placeholder-text">
        Player laden &amp; abspielen
        <small>Lädt Inhalte von Spotify (Drittanbieter)</small>
      </span>
    </button>
  );
}
