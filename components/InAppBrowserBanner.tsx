"use client";

import { useEffect, useState } from "react";

export default function InAppBrowserBanner() {
  const [visible, setVisible] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const inApp = /TikTok|BytedanceWebview|musical_ly|Instagram|FBAN|FBAV/i.test(ua);
    if (inApp && !sessionStorage.getItem("hideInAppBanner")) {
      setIsAndroid(/Android/i.test(ua));
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function openExternally() {
    const target = window.location.href.replace(/^https?:\/\//, "");
    window.location.href = `intent://${target}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
  }

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem("hideInAppBanner", "1");
  }

  return (
    <div className="inapp-banner">
      <span>
        📱 Du bist im In-App-Browser unterwegs — Spotify-Links funktionieren dort oft nicht.{" "}
        {isAndroid ? (
          "Tipp unten:"
        ) : (
          <>
            Tipp: oben rechts auf <strong>⋯</strong> tippen → <strong>„Im Browser öffnen"</strong>.
          </>
        )}
      </span>
      {isAndroid && (
        <button onClick={openExternally} className="inapp-banner-btn">
          Im Browser öffnen
        </button>
      )}
      <button onClick={dismiss} className="inapp-banner-close" aria-label="Schließen">
        ✕
      </button>
    </div>
  );
}
