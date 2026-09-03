"use client";

import { trackClick } from "@/lib/track";
import type { AnchorHTMLAttributes } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: string;
  eventData?: Record<string, string>;
};

export default function TrackedLink({ event, eventData, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      onClick={(e) => {
        onClick?.(e);
        // target="_blank" öffnet einen neuen Tab, der ursprüngliche bleibt
        // offen — dort darf der Tracking-Request einfach nebenbei laufen.
        // Bei einer Navigation im GLEICHEN Tab (z.B. intern zum Spiel) würde
        // der Browser sonst sofort wegnavigieren und den noch laufenden
        // Supabase-Insert abbrechen, bevor er ankommt — deshalb hier kurz
        // (mit Sicherheits-Timeout) auf den Tracking-Call warten, bevor
        // manuell weitergeleitet wird.
        if (props.target === "_blank" || !props.href) {
          trackClick(event, eventData);
          return;
        }
        e.preventDefault();
        const href = props.href;
        let navigated = false;
        const navigate = () => {
          if (navigated) return;
          navigated = true;
          window.location.href = href;
        };
        const safety = setTimeout(navigate, 400);
        trackClick(event, eventData).finally(() => {
          clearTimeout(safety);
          navigate();
        });
      }}
    />
  );
}
