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

function detectInAppBrowser(): string | null {
  const ua = navigator.userAgent || "";
  if (/TikTok|BytedanceWebview|musical_ly/i.test(ua)) return "TikTok";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  return null;
}

export default function SpotifyLinkButton({ href }: { href: string }) {
  const [appName, setAppName] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAppName(detectInAppBrowser());
  }, []);

  if (!appName) {
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

  function openModal() {
    trackClick("spotify-artist-click");
    setModalOpen(true);
  }

  async function handleCopy() {
    const ok = await copyToClipboard(href);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  return (
    <>
      <button type="button" className="pill-btn" onClick={openModal}>
        <SpotifyIcon />
        Profil
      </button>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Schließen"
            >
              ✕
            </button>
            <div className="modal-icon">
              <SpotifyIcon />
            </div>
            <h3>Du bist im {appName}-Browser</h3>
            <p>
              Spotify lässt sich hier leider nicht direkt öffnen. Kopier den Link und füg ihn in
              deinem normalen Browser (Chrome, Safari, ...) ein, um direkt zu Spotify zu kommen.
            </p>
            <button type="button" className="pill-btn modal-copy-btn" onClick={handleCopy}>
              {copied ? "Kopiert! ✓" : "Link kopieren"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
