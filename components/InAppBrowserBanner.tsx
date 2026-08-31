"use client";

import { useEffect, useState } from "react";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sequenced multi-scheme escape attempts, adapted from the community-tested
// approach at https://github.com/untitaker/in-app-browser-framebreaker —
// no single scheme works across all in-app browsers/OS versions, so we try
// several in order and let the first one that resolves win.
async function breakout() {
  const url = window.location.href;
  const bareUrl = window.location.hostname + window.location.pathname;

  // iOS
  window.location.href = "opera-" + url;
  await sleep(10);
  window.location.href = "firefox://open-url?url=" + url;
  await sleep(10);
  window.location.href =
    "googlechrome" + (window.location.protocol === "https:" ? "s" : "") + "://" + bareUrl;
  await sleep(10);

  // Android — generic intent, no forced package, opens whatever handles https VIEW
  window.location.href = "intent:" + url + "#Intent;end";
  await sleep(10);
  window.location.href = "googlechrome://navigate?url=" + window.location.hostname;
}

export default function InAppBrowserBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const inApp = /TikTok|BytedanceWebview|musical_ly|Instagram|FBAN|FBAV/i.test(ua);
    if (inApp && !sessionStorage.getItem("hideInAppBanner")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem("hideInAppBanner", "1");
  }

  return (
    <div className="inapp-banner">
      <span>
        📱 Du bist im In-App-Browser unterwegs — Spotify-Links funktionieren dort oft nicht. Falls
        der Button nichts tut: oben rechts auf <strong>⋯</strong> tippen →{" "}
        <strong>„Im Browser öffnen"</strong>.
      </span>
      <button onClick={breakout} className="inapp-banner-btn">
        Im Browser öffnen
      </button>
      <button onClick={dismiss} className="inapp-banner-close" aria-label="Schließen">
        ✕
      </button>
    </div>
  );
}
