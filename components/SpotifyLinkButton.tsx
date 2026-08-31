"use client";

import { useEffect, useState } from "react";
import { trackClick } from "@/lib/track";
import { SpotifyIcon } from "./Icons";

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy fallback
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default function SpotifyLinkButton({ href }: { href: string }) {
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    setInApp(/TikTok|BytedanceWebview|musical_ly|Instagram|FBAN|FBAV/i.test(ua));
  }, []);

  if (!inApp) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="pill-btn"
        onClick={() => trackClick("spotify-artist-click")}
      >
        <SpotifyIcon />
        Profil
      </a>
    );
  }

  async function handleClick() {
    trackClick("spotify-artist-click");
    const ok = await copyToClipboard(href);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    }
  }

  return (
    <div className="spotify-copy-wrap">
      <button type="button" onClick={handleClick} className="pill-btn">
        <SpotifyIcon />
        {copied ? "Kopiert!" : "Link kopieren"}
      </button>
      {copied && (
        <div className="spotify-copy-hint">Jetzt im Browser einfügen (nicht in dieser App)</div>
      )}
    </div>
  );
}
